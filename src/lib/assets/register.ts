import { db } from "../db";
import { enqueueEvent, registerHandler } from "../events/outbox";
import { postMaterialIssue } from "../inventory/ledger";
import { getStockBalance } from "../inventory/ledger";

/**
 * Outbox Event Handler for "commissioning.system_commissioned".
 * Automatically converts all commissioned testing loops under the system
 * into actual operational operating assets (AssetTags) in the Asset Registry.
 */
export async function systemCommissionedHandler(
  workspaceId: string,
  payload: { systemId: string; systemCode: string; name: string; projectId: string }
) {
  const { systemId, systemCode, name, projectId } = payload;

  await db.$transaction(async (tx) => {
    // 1. Fetch all passed loops under the system
    const loops = await tx.commissioningLoop.findMany({
      where: {
        systemId,
        status: "PASSED",
      },
    });

    if (loops.length === 0) return;

    console.log(
      `    [AssetRegister] Converting ${loops.length} commissioned loops into operational asset tags.`
    );

    // 2. Create AssetTag for each loop tag
    for (const loop of loops) {
      const assetCode = `AST-${loop.loopTag}`;
      
      // Upsert asset tag
      const asset = await tx.assetTag.upsert({
        where: {
          workspaceId_assetCode: {
            workspaceId,
            assetCode,
          },
        },
        create: {
          workspaceId,
          projectId,
          wbsNodeId: loop.wbsNodeId,
          assetCode,
          name: `${name} Loop - ${loop.loopTag}`,
          status: "OPERATIONAL",
        },
        update: {
          status: "OPERATIONAL",
          wbsNodeId: loop.wbsNodeId,
        },
      });

      // Enqueue event "asset.registered"
      await enqueueEvent(
        workspaceId,
        "asset.registered",
        { assetId: asset.id, assetCode, systemCode },
        tx
      );
    }
  });
}

export interface SpareSpareInput {
  itemCode: string;
  qty: number;
}

/**
 * Creates and performs a Maintenance Work Order, validating and consuming spare parts inventory.
 */
export async function createMaintenanceWorkOrder(
  workspaceId: string,
  projectId: string,
  wbsNodeId: string,
  assetId: string,
  woNumber: string,
  title: string,
  description: string,
  spares: SpareSpareInput[],
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Verify asset exists
    const asset = await transactionClient.assetTag.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error(`AssetTag with ID "${assetId}" not found.`);
    }

    // 2. Consume spares inventory if specified
    if (spares && spares.length > 0) {
      // Validate all spares stock first
      for (const spare of spares) {
        const stock = await getStockBalance(workspaceId, spare.itemCode, "MAIN", transactionClient);
        if (stock.quantity < spare.qty) {
          throw new Error(
            `Material warning: Spare part "${spare.itemCode}" is out of stock. Available: ${stock.quantity}, Needed: ${spare.qty}.`
          );
        }
      }

      // Deduct inventory and post GL journals using the material issue flow
      const issueLines = spares.map((s) => ({
        itemCode: s.itemCode,
        quantity: s.qty,
      }));

      await postMaterialIssue(
        workspaceId,
        projectId,
        wbsNodeId,
        issueLines,
        "MAIN",
        transactionClient
      );
    }

    // 3. Create completed Work Order log
    const workOrder = await transactionClient.maintenanceWorkOrder.create({
      data: {
        workspaceId,
        projectId,
        wbsNodeId,
        assetId,
        woNumber: woNumber.trim().toUpperCase(),
        title: title.trim(),
        description: description.trim(),
        status: "COMPLETED", // Issued spares and completed maintenance
        sparesConsumed: JSON.stringify(spares),
      },
    });

    // Enqueue event "work_order.completed"
    await enqueueEvent(
      workspaceId,
      "work_order.completed",
      { workOrderId: workOrder.id, woNumber, assetCode: asset.assetCode },
      transactionClient
    );

    return workOrder;
  });
}

// Register Handover Listener
registerHandler("commissioning.system_commissioned", systemCommissionedHandler);
