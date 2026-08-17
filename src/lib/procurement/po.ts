import { db } from "../db";
import { registerHandler } from "../events/outbox";
import { submitDocumentForApproval } from "../approvals/engine";
import { checkBudgetThreshold } from "../project/budget";

export interface CreatePoItemInput {
  itemCode: string;
  quantity: number;
  rate: number;
  wbsNodeId: string;
}

/**
 * Creates a new Purchase Order in PENDING status and submits it for SLA approval.
 */
export async function createPurchaseOrder(
  workspaceId: string,
  projectId: string,
  poNumber: string,
  supplierCode: string,
  items: CreatePoItemInput[],
  tx?: any
) {
  const client = tx || db;

  // 1. Verify supplier exists and is active
  const supplier = await client.supplierMaster.findUnique({
    where: {
      workspaceId_code: {
        workspaceId,
        code: supplierCode.toUpperCase(),
      },
    },
  });

  if (!supplier || !supplier.isActive) {
    throw new Error(`Supplier with code "${supplierCode}" not found or is inactive.`);
  }

  // 2. Verify all items exist
  const itemCodes = items.map((i) => i.itemCode.toUpperCase());
  const activeItems = await client.itemMaster.findMany({
    where: {
      workspaceId,
      code: { in: itemCodes },
      isActive: true,
    },
    select: { code: true },
  });

  const activeItemSet = new Set(activeItems.map((ai: { code: string }) => ai.code));
  for (const item of items) {
    if (!activeItemSet.has(item.itemCode.toUpperCase())) {
      throw new Error(`Item with code "${item.itemCode}" not found or is inactive.`);
    }
  }

  // 3. Verify budget thresholds for each item line
  for (const item of items) {
    const cost = item.quantity * item.rate;
    const check = await checkBudgetThreshold(item.wbsNodeId, cost, client);
    if (!check.allowed) {
      throw new Error(
        `Budget limit exceeded for WBS Node [${check.code} - ${check.name}]. Remaining budget: ${check.remaining}, Exposure: ${check.exposure}`
      );
    }
  }

  // 4. Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  // 5. Create Purchase Order and items
  const po = await client.purchaseOrder.create({
    data: {
      workspaceId,
      projectId,
      poNumber: poNumber.trim().toUpperCase(),
      supplierCode: supplierCode.toUpperCase(),
      status: "PENDING",
      totalAmount,
      items: {
        create: items.map((item) => ({
          itemCode: item.itemCode.toUpperCase(),
          quantity: item.quantity,
          rate: item.rate,
          wbsNodeId: item.wbsNodeId,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  // 6. Submit PO for SLA Approval
  await submitDocumentForApproval(workspaceId, "PO", po.id, totalAmount, client);

  return po;
}

/**
 * Event handler executed when a Purchase Order is fully approved.
 * Atomically updates committed costs on the corresponding WBS Nodes.
 */
export async function poApprovedEventHandler(
  workspaceId: string,
  payload: { documentId: string }
) {
  const poId = payload.documentId;

  // Run in a single transaction to ensure consistency
  await db.$transaction(async (tx) => {
    // 1. Fetch the PO and its items
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) {
      throw new Error(`Purchase Order ${poId} not found.`);
    }

    if (po.status === "APPROVED") {
      // Already processed (idempotency guard)
      return;
    }

    // 2. Update status
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: "APPROVED" },
    });

    // 3. Apportion committed cost to each WBS Node
    for (const item of po.items) {
      if (!item.wbsNodeId) continue;
      
      const cost = item.quantity * item.rate;

      await tx.wbsNode.update({
        where: { id: item.wbsNodeId },
        data: {
          committedCost: { increment: cost },
        },
      });
    }
  });
}

// Register the event handler with the outbox router
registerHandler("po.approved", poApprovedEventHandler);
