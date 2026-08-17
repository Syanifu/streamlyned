import { db } from "../db";
import { postJournalEntry } from "../finance/ledger";
import { enqueueEvent } from "../events/outbox";
import { calculateAdvanceRecovery } from "./contract";

export interface RaBillItemInput {
  wbsNodeId: string;
  claimedQty: number;
  rate: number;
}

/**
 * Creates a draft RA Bill recording the supervisor's claimed quantities.
 */
export async function createDraftRaBill(
  workspaceId: string,
  projectId: string,
  contractId: string,
  billNumber: string,
  billingDate: Date,
  items: RaBillItemInput[],
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Verify contract exists
    const contract = await transactionClient.clientContract.findUnique({
      where: { id: contractId },
    });

    if (!contract || contract.projectId !== projectId) {
      throw new Error(`Client Contract ${contractId} not found or mismatch for Project ${projectId}.`);
    }

    // 2. Compute cumulative claimed value
    const cumulativeClaimed = items.reduce((sum, item) => sum + item.claimedQty * item.rate, 0);

    // 3. Create Draft RA Bill
    const bill = await transactionClient.raBill.create({
      data: {
        workspaceId,
        projectId,
        contractId,
        billNumber: billNumber.trim().toUpperCase(),
        cumulativeClaimed,
        cumulativeCertified: 0,
        retentionDeduction: 0,
        advanceRecovery: 0,
        netPayable: 0,
        status: "DRAFT",
        billingDate,
        items: {
          create: items.map((item) => ({
            wbsNodeId: item.wbsNodeId,
            claimedQty: item.claimedQty,
            certifiedQty: 0, // not certified yet
            rate: item.rate,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return bill;
  });
}

export interface CertifyItemInput {
  itemId: string;
  certifiedQty: number;
}

/**
 * Certifies an RA Bill with the client-approved quantities,
 * calculates advance recoveries and retention deductions,
 * posts balanced revenue/receivable GL entries, and emits outbox events.
 */
export async function certifyRaBill(
  raBillId: string,
  certifiedItems: CertifyItemInput[],
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Fetch active RA Bill and its contract
    const bill = await transactionClient.raBill.findUnique({
      where: { id: raBillId },
      include: {
        items: true,
        contract: true,
      },
    });

    if (!bill || bill.status !== "DRAFT") {
      throw new Error(`RA Bill ${raBillId} not found or is already certified.`);
    }

    // 2. Update certified quantities for each item
    for (const cert of certifiedItems) {
      const item = bill.items.find((i: any) => i.id === cert.itemId);
      if (!item) {
        throw new Error(`RA Bill Item ${cert.itemId} not found on this bill.`);
      }

      await transactionClient.raBillItem.update({
        where: { id: cert.itemId },
        data: { certifiedQty: cert.certifiedQty },
      });
    }

    // Refetch updated items to calculate values
    const updatedItems = await transactionClient.raBillItem.findMany({
      where: { billId: raBillId },
    });

    const cumulativeCertified = updatedItems.reduce(
      (sum: number, item: any) => sum + item.certifiedQty * item.rate,
      0
    );

    // 3. Fetch previous certified bills on this contract to find period value
    const previousBills = await transactionClient.raBill.findMany({
      where: {
        contractId: bill.contractId,
        status: "CERTIFIED",
        billingDate: { lt: bill.billingDate },
      },
      orderBy: { billingDate: "desc" },
    });

    // Since billing is cumulative, previous cumulative certified value is the last bill's cumulativeCertified
    const previousCumulativeCertified = previousBills[0]?.cumulativeCertified || 0;
    const periodCertifiedValue = cumulativeCertified - previousCumulativeCertified;

    // 4. Calculate period deductions
    const retentionDeduction = periodCertifiedValue * (bill.contract.retentionPct / 100);
    const advanceRecovery = await calculateAdvanceRecovery(
      bill.contractId,
      periodCertifiedValue,
      transactionClient
    );

    const netPayable = periodCertifiedValue - retentionDeduction - advanceRecovery;

    // 5. Update RA Bill Status to CERTIFIED
    const certifiedBill = await transactionClient.raBill.update({
      where: { id: raBillId },
      data: {
        status: "CERTIFIED",
        cumulativeCertified,
        retentionDeduction,
        advanceRecovery,
        netPayable,
        certifiedAt: new Date(),
      },
    });

    // 6. Post General Ledger postings:
    // - Debit Accounts Receivable (1100) for Net Receivable
    // - Debit Accounts Receivable (1100) for Retention Deducted (held asset)
    // - Debit Accounts Receivable (1100) for Advance Recovery (offsets credit advance)
    // - Credit Project Construction Revenue (4000) for Gross Period Certified Value
    if (periodCertifiedValue > 0) {
      await postJournalEntry(
        bill.workspaceId,
        {
          ledgerDate: new Date(),
          referenceType: "RA_BILL",
          referenceId: bill.id,
          description: `Certified RA Bill #${bill.billNumber} for period value ${periodCertifiedValue}`,
          lines: [
            { coaCode: "1100", debit: netPayable, credit: 0, projectId: bill.projectId },
            { coaCode: "1100", debit: retentionDeduction, credit: 0, projectId: bill.projectId, description: "Retention receivable held by client" },
            { coaCode: "1100", debit: advanceRecovery, credit: 0, projectId: bill.projectId, description: "Mobilization advance recovery offset" },
            { coaCode: "4000", debit: 0, credit: periodCertifiedValue, projectId: bill.projectId },
          ],
        },
        transactionClient
      );
    }

    // 7. Enqueue outbox event "ra_bill.certified"
    await enqueueEvent(
      bill.workspaceId,
      "ra_bill.certified",
      { billId: bill.id, periodCertifiedValue, netPayable, billNumber: bill.billNumber },
      transactionClient
    );

    return certifiedBill;
  });
}
