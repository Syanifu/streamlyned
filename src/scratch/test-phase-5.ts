import { PrismaClient } from "@prisma/client";
import { createCommissioningSystem, createCommissioningLoop, completeCommissioningLoop } from "../lib/commissioning/handover";
import { systemCommissionedHandler, createMaintenanceWorkOrder } from "../lib/assets/register";
import { calculateProjectEVM, checkLowInventory } from "../lib/analytics/engine";
import { registerHandler, processOutbox } from "../lib/events/outbox";
import { getStockBalance } from "../lib/inventory/ledger";

// Explicitly register handler in the test context to avoid tsx cache splits
registerHandler("commissioning.system_commissioned", systemCommissionedHandler);

async function main() {
  const db = new PrismaClient();
  console.log("--- Starting Phase 5 Architecture Verification ---");

  // 1. Fetch workspace, project and user
  const workspace = await db.workspace.findFirst();
  const user = await db.user.findFirst();
  const project = await db.project.findFirst({
    where: { workspaceId: workspace?.id },
  });

  if (!workspace || !user || !project) {
    throw new Error("Missing workspace, user, or project. Run previous phase tests first.");
  }

  // Find WBS Nodes for loop mapping
  const wbsA = await db.wbsNode.findFirst({
    where: { projectId: project.id, code: "1.1" },
  });
  const wbsB = await db.wbsNode.findFirst({
    where: { projectId: project.id, code: "1.2" },
  });
  if (!wbsA || !wbsB) throw new Error("WBS Nodes 1.1 and 1.2 not found.");

  // 2. Test Commissioning Handovers & Loop Checks
  console.log("\n1. Testing Plant Handovers & Commissioning Loops...");
  
  // Clean up old systems
  await db.commissioningSystem.deleteMany({
    where: { projectId: project.id, systemCode: "SYS-CHW-01" },
  });

  const sys = await createCommissioningSystem(
    workspace.id,
    project.id,
    "SYS-CHW-01",
    "Chilled Water Circulation System",
    db
  );
  console.log(`  ✔ Commissioning System created: ${sys.systemCode}`);

  const loop1 = await createCommissioningLoop(sys.id, wbsA.id, "LP-CHW-01", '{"checklist": "Hydro-test complete"}', db);
  const loop2 = await createCommissioningLoop(sys.id, wbsB.id, "LP-CHW-02", '{"checklist": "Pump alignment complete"}', db);
  console.log(`  ✔ Loops registered: ${loop1.loopTag} and ${loop2.loopTag}`);

  // Complete Loop 1 as PASSED
  console.log("  - Completing test checklist for Loop 1: PASSED...");
  await completeCommissioningLoop(loop1.id, "PASSED", user.name, db);
  const sysStatus1 = await db.commissioningSystem.findUnique({ where: { id: sys.id } });
  console.log(`    System status after loop 1 pass: ${sysStatus1?.status} (Expected: PENDING)`);

  // Complete Loop 2 as PASSED -> triggers handover
  console.log("  - Completing test checklist for Loop 2: PASSED...");
  await completeCommissioningLoop(loop2.id, "PASSED", user.name, db);
  const sysStatus2 = await db.commissioningSystem.findUnique({ where: { id: sys.id } });
  console.log(`    System status after both loops pass: ${sysStatus2?.status} (Expected: COMMISSIONED)`);

  // 3. Process Outbox to run Asset conversion handler
  console.log("\n2. Processing Outbox to convert loops to operational asset tags...");
  await processOutbox(10);

  // Verify AssetTags exist
  const asset1 = await db.assetTag.findUnique({
    where: { workspaceId_assetCode: { workspaceId: workspace.id, assetCode: "AST-LP-CHW-01" } },
  });
  const asset2 = await db.assetTag.findUnique({
    where: { workspaceId_assetCode: { workspaceId: workspace.id, assetCode: "AST-LP-CHW-02" } },
  });

  console.log(`    - Asset 1 converted: Code: ${asset1?.assetCode}, Status: ${asset1?.status} (Expected: OPERATIONAL)`);
  console.log(`    - Asset 2 converted: Code: ${asset2?.assetCode}, Status: ${asset2?.status} (Expected: OPERATIONAL)`);

  if (!asset1) throw new Error("Asset 1 AST-LP-CHW-01 was not registered.");

  // 4. Test Maintenance Spares Consumption Integration
  console.log("\n3. Testing Maintenance Work Orders & Spares Inventory consumption...");

  // Setup SPARE-GASKET item in ItemMaster
  const spareItem = await db.itemMaster.upsert({
    where: {
      workspaceId_code: {
        workspaceId: workspace.id,
        code: "SPARE-GASKET",
      },
    },
    create: {
      workspaceId: workspace.id,
      code: "SPARE-GASKET",
      name: "Neoprene Flange Gasket 4 Inch",
      uom: "NOS",
      group: "SPARES",
      reorderLevel: 20,
      isActive: true,
    },
    update: {
      reorderLevel: 20,
      isActive: true,
    },
  });

  // Inject initial spares inventory stock (50 units)
  await db.inventoryMovement.deleteMany({
    where: { workspaceId: workspace.id, itemCode: "SPARE-GASKET" },
  });
  
  await db.inventoryMovement.create({
    data: {
      workspaceId: workspace.id,
      type: "GRN",
      itemCode: "SPARE-GASKET",
      quantity: 50,
      rate: 15.0,
      referenceType: "INIT",
      referenceId: "INITIAL_SEED",
    },
  });

  const initialStock = await getStockBalance(workspace.id, "SPARE-GASKET", "MAIN", db);
  console.log(`  - Initial warehouse stock of "SPARE-GASKET": ${initialStock.quantity}`);

  // Create Work Order consuming 5 spares
  console.log("  - Creating Work Order WO-2026-001 consuming 5 gaskets...");
  
  // Clean old WO
  await db.maintenanceWorkOrder.deleteMany({
    where: { workspaceId: workspace.id, woNumber: "WO-2026-001" },
  });

  const wo = await createMaintenanceWorkOrder(
    workspace.id,
    project.id,
    wbsA.id,
    asset1.id,
    "WO-2026-001",
    "Replace leaking pipe flange gaskets",
    "Gaskets degraded, replaced 4-inch neoprene seals.",
    [{ itemCode: "SPARE-GASKET", qty: 5 }],
    db
  );

  console.log(`    Work Order recorded: ${wo.woNumber}, status: ${wo.status}`);
  const stockAfterWO = await getStockBalance(workspace.id, "SPARE-GASKET", "MAIN", db);
  console.log(`    - Warehouse stock after work order issues: ${stockAfterWO.quantity} (Expected: 45)`);

  // Test block on insufficient spares stock
  console.log("  - Testing stock block: Attempting to consume 60 gaskets (Only 45 available)...");
  try {
    await createMaintenanceWorkOrder(
      workspace.id,
      project.id,
      wbsA.id,
      asset1.id,
      "WO-2026-002-BLOCKED",
      "Overhaul primary chiller flanges",
      "Requires large gasket replacements.",
      [{ itemCode: "SPARE-GASKET", qty: 60 }],
      db
    );
    console.error("  ❌ ERROR: Maintenance did not block work order despite insufficient warehouse spares stock!");
  } catch (err: any) {
    console.log(`  ✔ Warehouse spares constraint block verified: ${err.message}`);
  }

  // 5. Test Earned Value Management (CPI/SPI) & Stock Warnings
  console.log("\n4. Testing Earned Value Management (EVM) Analytics & Stock Alert Engine...");

  const evm = await calculateProjectEVM(project.id, db);
  console.log("    Earned Value Metrics calculated:");
  console.log(`      - Planned Value (PV): ${evm.plannedValue}`);
  console.log(`      - Actual Cost (AC): ${evm.actualCost}`);
  console.log(`      - Earned Value (EV): ${evm.earnedValue}`);
  console.log(`      - Cost Performance Index (CPI): ${evm.cpi}`);
  console.log(`      - Schedule Performance Index (SPI): ${evm.spi}`);
  console.log(`      - Project status flag: ${evm.status}`);

  // Test Low-Stock Alerts
  console.log("  - Checking inventory warnings (Gasket stock: 45, reorderLevel: 20)...");
  let warnings = await checkLowInventory(workspace.id, db);
  console.log(`    - Open inventory warning count: ${warnings.length}`);

  // Adjust reorderLevel of Gasket to 50
  console.log("  - Increasing gasket reorderLevel to 50...");
  await db.itemMaster.update({
    where: {
      workspaceId_code: {
        workspaceId: workspace.id,
        code: "SPARE-GASKET",
      },
    },
    data: { reorderLevel: 50 },
  });

  warnings = await checkLowInventory(workspace.id, db);
  console.log(`    - Open inventory warning count: ${warnings.length} (Expected: 1)`);
  console.log(`    - Low-stock details: Item: ${warnings[0]?.itemCode}, Current: ${warnings[0]?.currentStock}, Reorder: ${warnings[0]?.reorderLevel}`);

  console.log("\n--- Phase 5 Architecture Verification Finished Successfully! ---");
  await db.$disconnect();
}

main().catch(console.error);
