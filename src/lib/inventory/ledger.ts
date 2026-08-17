import { db } from "../db";
import { postJournalEntry } from "../finance/ledger";
import { enqueueEvent } from "../events/outbox";

export interface StockStatus {
  quantity: number;
  rate: number;
}

/**
 * Computes on-hand quantity and moving-average cost rate for an item in a warehouse chronologically.
 */
export async function getStockBalance(
  workspaceId: string,
  itemCode: string,
  warehouse = "MAIN",
  tx?: any
): Promise<StockStatus> {
  const client = tx || db;

  // Retrieve all chronological movements
  const movements = await client.inventoryMovement.findMany({
    where: {
      workspaceId,
      itemCode: itemCode.toUpperCase(),
      warehouse,
    },
    orderBy: { createdAt: "asc" },
  });

  let totalQty = 0;
  let averageRate = 0;

  for (const mov of movements) {
    if (mov.quantity > 0) {
      // Stock receipt: recalculate moving average
      const oldValuation = totalQty * averageRate;
      const newValuation = oldValuation + mov.quantity * mov.rate;
      totalQty += mov.quantity;
      averageRate = totalQty > 0 ? newValuation / totalQty : 0;
    } else {
      // Stock issue: decreases quantity, rate remains same
      totalQty += mov.quantity; // mov.quantity is negative for issues
    }
  }

  return {
    quantity: totalQty,
    rate: averageRate,
  };
}

export interface GrnLineInput {
  itemCode: string;
  quantity: number;
  rate: number;
}

/**
 * Posts a Goods Receipt Note (GRN) against a Purchase Order.
 */
export async function postGoodsReceiptNote(
  workspaceId: string,
  projectId: string,
  poId: string,
  lines: GrnLineInput[],
  warehouse = "MAIN",
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Verify PO exists and is approved
    const po = await transactionClient.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po || po.status !== "APPROVED") {
      throw new Error(`Cannot post GRN: Purchase Order ${poId} not found or is not approved.`);
    }

    const grnMovements = [];
    let totalGrnValue = 0;

    // 2. Validate line items and record stock movement
    for (const line of lines) {
      const poItem = po.items.find(
        (pi: any) => pi.itemCode === line.itemCode.toUpperCase()
      );

      if (!poItem) {
        throw new Error(`Item ${line.itemCode} does not exist on Purchase Order.`);
      }

      // Record GRN Inventory Movement
      const movement = await transactionClient.inventoryMovement.create({
        data: {
          workspaceId,
          type: "GRN",
          itemCode: line.itemCode.toUpperCase(),
          quantity: line.quantity,
          rate: line.rate,
          referenceType: "PO",
          referenceId: poId,
          projectId,
          wbsNodeId: poItem.wbsNodeId,
          warehouse,
        },
      });

      grnMovements.push(movement);
      totalGrnValue += line.quantity * line.rate;
    }

    // 3. Post General Ledger postings:
    // - Debit: Inventory Asset (1200)
    // - Credit: Accounts Payable (2000)
    await postJournalEntry(
      workspaceId,
      {
        ledgerDate: new Date(),
        referenceType: "GRN",
        referenceId: poId,
        description: `Goods receipt note against PO Number ${po.poNumber}`,
        lines: [
          { coaCode: "1200", debit: totalGrnValue, credit: 0, projectId },
          { coaCode: "2000", debit: 0, credit: totalGrnValue, projectId },
        ],
      },
      transactionClient
    );

    // 4. Enqueue outbox event "grn.submitted"
    await enqueueEvent(
      workspaceId,
      "grn.submitted",
      { poId, totalValue: totalGrnValue, itemsCount: lines.length },
      transactionClient
    );

    return { success: true, movements: grnMovements };
  }, { timeout: 10000 }); // setting transaction timeout
}

export interface IssueLineInput {
  itemCode: string;
  quantity: number;
}

/**
 * Issues stock materials to a specific WBS Node for physical construction.
 */
export async function postMaterialIssue(
  workspaceId: string,
  projectId: string,
  wbsNodeId: string,
  lines: IssueLineInput[],
  warehouse = "MAIN",
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    const issueMovements = [];
    let totalIssueValue = 0;

    // 1. Validate on-hand stock and post issues
    for (const line of lines) {
      const itemCodeClean = line.itemCode.toUpperCase();
      const stock = await getStockBalance(workspaceId, itemCodeClean, warehouse, transactionClient);

      if (stock.quantity < line.quantity) {
        throw new Error(
          `Insufficient stock for item "${itemCodeClean}" in warehouse "${warehouse}". Available: ${stock.quantity}, Requested: ${line.quantity}`
        );
      }

      // Record negative movement at current moving-average cost rate
      const movement = await transactionClient.inventoryMovement.create({
        data: {
          workspaceId,
          type: "ISSUE",
          itemCode: itemCodeClean,
          quantity: -line.quantity, // Negative for issue
          rate: stock.rate,
          referenceType: "WBS",
          referenceId: wbsNodeId,
          projectId,
          wbsNodeId,
          warehouse,
        },
      });

      issueMovements.push(movement);
      totalIssueValue += line.quantity * stock.rate;
    }

    // 2. Adjust cost values on the WBS Node:
    // - Increase actualCost (since material is consumed at site)
    // - Decrease committedCost (releases PO commitment amount of the issued value)
    await transactionClient.wbsNode.update({
      where: { id: wbsNodeId },
      data: {
        actualCost: { increment: totalIssueValue },
        committedCost: { decrement: totalIssueValue },
      },
    });

    // 3. Post General Ledger entries:
    // - Debit: WIP Construction Costs (1300)
    // - Credit: Material Inventory Asset (1200)
    await postJournalEntry(
      workspaceId,
      {
        ledgerDate: new Date(),
        referenceType: "ISSUE",
        referenceId: wbsNodeId,
        description: `Material issued to WBS Node ID ${wbsNodeId}`,
        lines: [
          { coaCode: "1300", debit: totalIssueValue, credit: 0, projectId, wbsCode: wbsNodeId },
          { coaCode: "1200", debit: 0, credit: totalIssueValue, projectId },
        ],
      },
      transactionClient
    );

    // 4. Enqueue outbox event "material_issue.submitted"
    await enqueueEvent(
      workspaceId,
      "material_issue.submitted",
      { wbsNodeId, totalValue: totalIssueValue, linesCount: lines.length },
      transactionClient
    );

    return { success: true, movements: issueMovements };
  });
}
