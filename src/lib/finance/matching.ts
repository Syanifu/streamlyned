import { db } from "../db";
import { enqueueEvent } from "../events/outbox";

export interface InvoiceLineInput {
  itemCode: string;
  quantity: number;
  rate: number;
}

export interface MatchResult {
  status: "MATCHED" | "MISMATCHED";
  discrepancies: string[];
}

/**
 * Creates a supplier invoice and automatically triggers a 3-way match.
 */
export async function createSupplierInvoice(
  workspaceId: string,
  projectId: string,
  poId: string,
  invoiceNumber: string,
  invoiceDate: Date,
  lines: InvoiceLineInput[],
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Create the Purchase Invoice in PENDING
    const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0);

    const invoice = await transactionClient.purchaseInvoice.create({
      data: {
        workspaceId,
        projectId,
        invoiceNumber: invoiceNumber.trim(),
        supplierCode: "", // will resolve from PO
        status: "PENDING",
        totalAmount,
        invoiceDate,
        poId,
        items: {
          create: lines.map((line) => ({
            itemCode: line.itemCode.toUpperCase(),
            quantity: line.quantity,
            rate: line.rate,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Perform 3-Way Match
    const match = await perform3WayMatch(invoice.id, transactionClient);

    // Update status based on match result
    const finalStatus = match.status === "MATCHED" ? "APPROVED" : "MISMATCHED";
    const updatedInvoice = await transactionClient.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        status: finalStatus,
        supplierCode: match.supplierCode || "",
      },
      include: { items: true },
    });

    // Enqueue outbox event
    await enqueueEvent(
      workspaceId,
      `purchase_invoice.${finalStatus.toLowerCase()}`,
      { invoiceId: invoice.id, invoiceNumber, discrepancies: match.discrepancies },
      transactionClient
    );

    return { invoice: updatedInvoice, match };
  });
}

/**
 * Performs a 3-way match (PO vs GRN vs Invoice) for a given purchase invoice.
 */
export async function perform3WayMatch(
  invoiceId: string,
  tx?: any
): Promise<MatchResult & { supplierCode?: string }> {
  const client = tx || db;

  // 1. Fetch Invoice
  const invoice = await client.purchaseInvoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) {
    throw new Error(`Invoice ${invoiceId} not found.`);
  }

  if (!invoice.poId) {
    return {
      status: "MISMATCHED",
      discrepancies: ["No Purchase Order (poId) associated with this invoice."],
    };
  }

  // 2. Fetch PO and its items
  const po = await client.purchaseOrder.findUnique({
    where: { id: invoice.poId },
    include: { items: true },
  });

  if (!po) {
    throw new Error(`Purchase Order ${invoice.poId} not found.`);
  }

  // 3. Fetch all GRN movements associated with this PO
  const grnMovements = await client.inventoryMovement.findMany({
    where: {
      workspaceId: invoice.workspaceId,
      referenceType: "PO",
      referenceId: invoice.poId,
      type: "GRN",
    },
  });

  const discrepancies: string[] = [];

  // Group GRN quantities by item code
  const grnQtyMap: Record<string, number> = {};
  for (const mov of grnMovements) {
    const code = mov.itemCode.toUpperCase();
    grnQtyMap[code] = (grnQtyMap[code] || 0) + mov.quantity;
  }

  // Group previously invoiced quantities by item code
  const previousInvoices = await client.purchaseInvoice.findMany({
    where: {
      poId: invoice.poId,
      status: "APPROVED",
      id: { not: invoice.id },
    },
    include: { items: true },
  });

  const prevInvoicedMap: Record<string, number> = {};
  for (const pinv of previousInvoices) {
    for (const item of pinv.items) {
      const code = item.itemCode.toUpperCase();
      prevInvoicedMap[code] = (prevInvoicedMap[code] || 0) + item.quantity;
    }
  }

  // Reconcile each invoice line
  for (const line of invoice.items) {
    const itemCode = line.itemCode.toUpperCase();

    // Find PO item baseline
    const poItem = po.items.find((pi: any) => pi.itemCode === itemCode);
    if (!poItem) {
      discrepancies.push(`Item "${itemCode}" was invoiced but does not exist on PO.`);
      continue;
    }

    // A. Rate Check (Invoice rate must not exceed PO rate)
    if (line.rate > poItem.rate) {
      discrepancies.push(
        `Rate mismatch for "${itemCode}": Invoiced: ${line.rate}, PO Baseline: ${poItem.rate}.`
      );
    }

    // B. Quantity Check (Cumulative invoiced qty must not exceed received GRN qty)
    const receivedQty = grnQtyMap[itemCode] || 0;
    const prevInvoiced = prevInvoicedMap[itemCode] || 0;
    const allowableInvoiced = receivedQty - prevInvoiced;

    // We allow a small tolerance (e.g. 0.1% or 0.01 units) for decimal rounding issues
    if (line.quantity > allowableInvoiced + 0.01) {
      discrepancies.push(
        `Quantity mismatch for "${itemCode}": Invoiced: ${line.quantity}, Max allowable based on GRN receipts: ${allowableInvoiced} (Total Received: ${receivedQty}, Previously Invoiced: ${prevInvoiced}).`
      );
    }
  }

  const isMatched = discrepancies.length === 0;

  return {
    status: isMatched ? "MATCHED" : "MISMATCHED",
    discrepancies,
    supplierCode: po.supplierCode,
  };
}
