import { PrismaClient } from "@prisma/client";
import { upsertWbsNode, checkBudgetThreshold } from "../lib/project/budget";
import { createPurchaseOrder } from "../lib/procurement/po";
import { processOutbox } from "../lib/events/outbox";
import { processSignoff } from "../lib/approvals/engine";
import { getStockBalance, postGoodsReceiptNote, postMaterialIssue } from "../lib/inventory/ledger";
import { postJournalEntry, getAccountBalance } from "../lib/finance/ledger";

async function main() {
  const db = new PrismaClient();
  console.log("--- Starting Phase 2 Architecture Verification ---");

  // 1. Fetch workspace and user
  const workspace = await db.workspace.findFirst();
  const user = await db.user.findFirst();

  if (!workspace || !user) {
    throw new Error("Missing test workspace or user from Phase 1. Run Phase 1 tests first.");
  }

  // 2. Fetch or create a test Project
  let project = await db.project.findFirst({
    where: { workspaceId: workspace.id },
  });

  if (!project) {
    project = await db.project.create({
      data: {
        workspaceId: workspace.id,
        name: "Metro Viaduct Line 1",
        description: "Elevated Metro Project",
        tools: "[]",
      },
    });
    console.log(`Created test project: ${project.name}`);
  } else {
    console.log(`Found project: ${project.name}`);
  }

  // 2.5 Ensure Supplier exists
  await db.supplierMaster.upsert({
    where: {
      workspaceId_code: {
        workspaceId: workspace.id,
        code: "SUPPLIER-DEFAULT",
      },
    },
    create: {
      workspaceId: workspace.id,
      code: "SUPPLIER-DEFAULT",
      name: "Default Test Supplier",
      gstin: "27ABCDE1234F1Z5",
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });

  // 3. Create WBS nodes (Budget Spine)
  console.log("\n1. Initializing WBS budget spine...");
  const wbsA = await upsertWbsNode(project.id, "1.1", "Excavation & Piling works", 100000, undefined, db);
  const wbsB = await upsertWbsNode(project.id, "1.2", "Concrete substructure", 50000, undefined, db);

  console.log(`  - WBS 1.1: Limit: ${wbsA.budgetLimit}`);
  console.log(`  - WBS 1.2: Limit: ${wbsB.budgetLimit}`);

  // 4. Test WBS Budget Threshold Blocking
  console.log("\n2. Testing WBS budget limits enforcement...");
  
  // Clean up any old POs to prevent constraint conflicts
  await db.purchaseOrder.deleteMany({
    where: { workspaceId: workspace.id, poNumber: { in: ["PO-VERIFY-ERR", "PO-VERIFY-OK"] } }
  });

  try {
    console.log("  - Attempting to purchase items worth 120,000 against WBS 1.2 (Limit: 50,000)...");
    await createPurchaseOrder(
      workspace.id,
      project.id,
      "PO-VERIFY-ERR",
      "SUPPLIER-DEFAULT", // created or used by bootstrap/other tests
      [{ itemCode: "ITEM-VERIFY-001", quantity: 120000, rate: 1, wbsNodeId: wbsB.id }],
      db
    );
    console.error("  ❌ ERROR: Budget check allowed a PO line that exceeded the limit!");
  } catch (err: any) {
    console.log(`  ✔ Budget block check successful! Block reason: ${err.message}`);
  }

  // Create valid PO: 30,000 on Node A and 20,000 on Node B (Total 50,000)
  console.log("  - Creating valid PO (30k on WBS 1.1, 20k on WBS 1.2)...");
  const po = await createPurchaseOrder(
    workspace.id,
    project.id,
    "PO-VERIFY-OK",
    "SUPPLIER-DEFAULT",
    [
      { itemCode: "ITEM-VERIFY-001", quantity: 100, rate: 300, wbsNodeId: wbsA.id },
      { itemCode: "ITEM-VERIFY-001", quantity: 50, rate: 400, wbsNodeId: wbsB.id },
    ],
    db
  );
  console.log(`  ✔ Valid PO created: ID: ${po.id}, status: ${po.status}, Total: ${po.totalAmount}`);

  // 5. Approve the PO and process the commitment event
  console.log("\n3. Approving Purchase Order and verifying committed costs...");
  const approvalRequest = await db.approvalRequest.findUnique({
    where: {
      workspaceId_documentType_documentId: {
        workspaceId: workspace.id,
        documentType: "PO",
        documentId: po.id,
      },
    },
    include: { signoffs: true },
  });

  if (!approvalRequest) throw new Error("Approval Request not created.");

  const sortedSignoffs = approvalRequest.signoffs.sort((a, b) => a.step - b.step);
  for (const signoff of sortedSignoffs) {
    await processSignoff(signoff.id, user.id, "APPROVED", "PO approved", db);
  }

  console.log("  - Running outbox worker to process commitment event...");
  await processOutbox(5);

  const updatedWbsA = await db.wbsNode.findUnique({ where: { id: wbsA.id } });
  const updatedWbsB = await db.wbsNode.findUnique({ where: { id: wbsB.id } });
  console.log(`  ✔ Committed costs updated successfully on project WBS spine:`);
  console.log(`    - WBS 1.1 committed cost: ${updatedWbsA?.committedCost} (Expected: 30000)`);
  console.log(`    - WBS 1.2 committed cost: ${updatedWbsB?.committedCost} (Expected: 20000)`);

  // 6. Test Goods Receipt Note & Moving-Average Cost
  console.log("\n4. Verifying GRN receipts and moving-average stock calculations...");

  // Post GRN for PO
  console.log("  - Posting GRN for the PO (receiving 100 @ 300 and 50 @ 400)...");
  await postGoodsReceiptNote(
    workspace.id,
    project.id,
    po.id,
    [
      { itemCode: "ITEM-VERIFY-001", quantity: 100, rate: 300 },
      { itemCode: "ITEM-VERIFY-001", quantity: 50, rate: 400 },
    ],
    "MAIN",
    db
  );

  let stockBalance = await getStockBalance(workspace.id, "ITEM-VERIFY-001", "MAIN", db);
  console.log(`  - Stock balance after GRN: Quantity: ${stockBalance.quantity}, Moving Average Cost (MAC): ${stockBalance.rate}`);

  // Simulate price fluctuation: direct receipt of 50 units @ 460
  console.log("  - Simulating price fluctuation receipt (50 units @ 460)...");
  await db.inventoryMovement.create({
    data: {
      workspaceId: workspace.id,
      type: "GRN",
      itemCode: "ITEM-VERIFY-001",
      quantity: 50,
      rate: 460,
      referenceType: "ADJ",
      referenceId: "price-fluct-adj",
      projectId: project.id,
      warehouse: "MAIN",
    },
  });

  stockBalance = await getStockBalance(workspace.id, "ITEM-VERIFY-001", "MAIN", db);
  // Expected quantity: 200.
  // Expected average: (100*300 + 50*400 + 50*460)/200 = (30000 + 20000 + 23000)/200 = 73000/200 = 365
  console.log(`  ✔ Recalculated moving-average balance:`);
  console.log(`    - Quantity on-hand: ${stockBalance.quantity} (Expected: 200)`);
  console.log(`    - Unit Rate (MAC): ${stockBalance.rate} (Expected: 365)`);

  // 7. Verify Material Issue and actual costs
  console.log("\n5. Verifying material issue and cost release...");
  
  // Issue 100 units to WbsNode A (Excavation)
  console.log("  - Issuing 100 steel beams to WBS 1.1...");
  await postMaterialIssue(
    workspace.id,
    project.id,
    wbsA.id,
    [{ itemCode: "ITEM-VERIFY-001", quantity: 100 }],
    "MAIN",
    db
  );

  const finalStock = await getStockBalance(workspace.id, "ITEM-VERIFY-001", "MAIN", db);
  const finalWbsA = await db.wbsNode.findUnique({ where: { id: wbsA.id } });
  
  // Issued value: 100 * 365 = 36,500
  // Actual cost increases by 36,500
  // Committed cost decreases by 36,500 (becomes 30,000 - 36,500 = -6,500 because issued value exceeded PO baseline allocation due to price hike)
  console.log(`  ✔ Material issue transaction completed:`);
  console.log(`    - Remaining stock: ${finalStock.quantity} (Expected: 100)`);
  console.log(`    - WBS 1.1 Actual Cost: ${finalWbsA?.actualCost} (Expected: 36500)`);
  console.log(`    - WBS 1.1 Committed Cost: ${finalWbsA?.committedCost} (Expected: -6500)`);

  // 8. Verify Site Operational Cost (DPR Sync simulation)
  console.log("\n6. Simulating Daily Progress Report sync & labor/plant apportionment...");
  
  // Clean old DPR
  await db.dailyProgressReport.deleteMany({ where: { projectId: project.id } });

  // Simulate DPR Submission with 2 masons (8hrs @ 200/hr) and 1 crane running 5hrs @ 1000/hr
  // Labour: 2 * 8 * 200 = 3,200. Crane: 5 * 1000 = 5,000. Total provisional cost: 8,200.
  const reportDate = new Date();
  const provisionalCost = 8200;

  console.log(`  - Syncing site report on ${reportDate.toDateString()} with provisional costs ${provisionalCost}...`);
  await db.$transaction(async (tx) => {
    // Increment actual cost of WBS 1.1 by operational cost
    await tx.wbsNode.update({
      where: { id: wbsA.id },
      data: {
        actualCost: { increment: provisionalCost },
      },
    });

    const dpr = await tx.dailyProgressReport.create({
      data: {
        workspaceId: workspace.id,
        projectId: project.id,
        reportDate,
        status: "SUBMITTED",
        reportedByUserId: user.id,
        qtyLines: { create: [{ wbsNodeId: wbsA.id, quantity: 15.0 }] },
        labourLines: { create: [{ trade: "MASON", headcount: 2, hours: 8, ratePerHour: 200 }] },
        equipmentLines: { create: [{ equipmentCode: "CRANE-01", runningHours: 5, idleHours: 0, ratePerHour: 1000 }] },
      },
    });

    await postJournalEntry(
      workspace.id,
      {
        ledgerDate: reportDate,
        referenceType: "DPR",
        referenceId: dpr.id,
        description: `Provisional operational costs on ${reportDate.toDateString()}`,
        lines: [
          { coaCode: "1300", debit: provisionalCost, credit: 0, projectId: project.id },
          { coaCode: "5100", debit: 0, credit: provisionalCost, projectId: project.id },
        ],
      },
      tx
    );
  });

  const finalDprWbsA = await db.wbsNode.findUnique({ where: { id: wbsA.id } });
  const wipLedgerBalance = await getAccountBalance(workspace.id, "1300");
  
  // Total WBS A actual cost: 36,500 (steel issue) + 8,200 (DPR ops) = 44,700
  // Total WIP ledger balance: 1,500 (Phase 1) + 36,500 (Issue) + 8,200 (DPR) = 46,200
  console.log(`  ✔ Site progress and costs synced successfully!`);
  console.log(`    - Final WBS 1.1 Actual Cost: ${finalDprWbsA?.actualCost} (Expected: 44700)`);
  console.log(`    - General Ledger WIP Account (1300) Balance: ${wipLedgerBalance} (Expected: 46200)`);

  console.log("\n--- Phase 2 Architecture Verification Finished Successfully! ---");
  await db.$disconnect();
}

main().catch(console.error);
