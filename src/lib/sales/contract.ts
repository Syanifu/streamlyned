import { db } from "../db";
import { postJournalEntry } from "../finance/ledger";

/**
 * Creates a Client Contract registry and posts mobilization advance journal entries if applicable.
 */
export async function createClientContract(
  workspaceId: string,
  projectId: string,
  contractNumber: string,
  customerCode: string,
  totalValue: number,
  advanceAmount = 0,
  advanceRecoveryPct = 0,
  retentionPct = 0,
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Verify customer exists in customer master
    const customer = await transactionClient.customerMaster.findUnique({
      where: {
        workspaceId_code: {
          workspaceId,
          code: customerCode.toUpperCase(),
        },
      },
    });

    if (!customer || !customer.isActive) {
      throw new Error(`Customer with code "${customerCode}" not found or is inactive.`);
    }

    // 2. Create the contract
    const contract = await transactionClient.clientContract.create({
      data: {
        workspaceId,
        projectId,
        contractNumber: contractNumber.trim().toUpperCase(),
        customerCode: customerCode.toUpperCase(),
        totalValue,
        advanceAmount,
        advanceRecoveryPct,
        retentionPct,
      },
    });

    // 3. Post General Ledger entries for mobilization advance if received (> 0)
    // - Debit: Cash & Bank Accounts (1000)
    // - Credit: Accounts Receivable (1100) - decreases debtor balance
    if (advanceAmount > 0) {
      await postJournalEntry(
        workspaceId,
        {
          ledgerDate: new Date(),
          referenceType: "CONTRACT_ADV",
          referenceId: contract.id,
          description: `Mobilization advance received on Contract ${contract.contractNumber}`,
          lines: [
            { coaCode: "1000", debit: advanceAmount, credit: 0, projectId },
            { coaCode: "1100", debit: 0, credit: advanceAmount, projectId },
          ],
        },
        transactionClient
      );
    }

    return contract;
  });
}

/**
 * Calculates the mobilization advance recovery deduction for the current bill.
 * Ensures total recovered deductions do not exceed the initial advanceAmount.
 */
export async function calculateAdvanceRecovery(
  contractId: string,
  currentBillCertifiedValue: number,
  tx?: any
): Promise<number> {
  const client = tx || db;

  // 1. Fetch contract advance details
  const contract = await client.clientContract.findUnique({
    where: { id: contractId },
    select: { advanceAmount: true, advanceRecoveryPct: true },
  });

  if (!contract) {
    throw new Error(`Contract ${contractId} not found.`);
  }

  if (contract.advanceAmount <= 0 || contract.advanceRecoveryPct <= 0) {
    return 0;
  }

  // 2. Fetch all previous certified bills to check recovery totals
  const previousBills = await client.raBill.findMany({
    where: {
      contractId,
      status: "CERTIFIED",
    },
    select: { advanceRecovery: true },
  });

  const totalRecoveredBefore = previousBills.reduce(
    (sum: number, bill: { advanceRecovery: number }) => sum + bill.advanceRecovery,
    0
  );

  const remainingToRecover = contract.advanceAmount - totalRecoveredBefore;
  if (remainingToRecover <= 0) {
    return 0;
  }

  // Calculate provisional recovery: certifiedValue * recovery%
  const provisionalRecovery = currentBillCertifiedValue * (contract.advanceRecoveryPct / 100);

  // Cap current recovery at remaining balance
  return Math.min(provisionalRecovery, remainingToRecover);
}
