import { db } from "../db";

export interface JournalEntryLine {
  coaCode: string;
  debit: number;
  credit: number;
  projectId?: string;
  wbsCode?: string;
  description?: string;
}

export interface JournalEntryParams {
  ledgerDate: Date;
  referenceType: string;
  referenceId: string;
  description?: string;
  lines: JournalEntryLine[];
}

/**
 * Seeds a default Chart of Accounts (COA) for a workspace.
 */
export async function bootstrapDefaultAccounts(workspaceId: string, tx?: any) {
  const client = tx || db;

  const defaultAccounts = [
    { code: "1000", name: "Cash & Bank Accounts", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable (Debtors)", type: "ASSET" },
    { code: "1200", name: "Material Inventory Asset", type: "ASSET" },
    { code: "1300", name: "WIP Construction Costs", type: "ASSET" },
    { code: "2000", name: "Accounts Payable (Creditors)", type: "LIABILITY" },
    { code: "2100", name: "Client Retention Payable", type: "LIABILITY" },
    { code: "3000", name: "Shareholder Capital / Equity", type: "EQUITY" },
    { code: "4000", name: "Project Construction Revenue", type: "REVENUE" },
    { code: "5000", name: "Direct Material Consumption Cost", type: "EXPENSE" },
    { code: "5100", name: "Direct Construction Labor Cost", type: "EXPENSE" },
    { code: "5200", name: "Subcontractor / Executed Works Cost", type: "EXPENSE" },
  ];

  const creations = defaultAccounts.map((acc) =>
    client.chartOfAccounts.upsert({
      where: {
        workspaceId_code: {
          workspaceId,
          code: acc.code,
        },
      },
      create: {
        workspaceId,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
      update: {
        name: acc.name,
        type: acc.type,
      },
    })
  );

  return await Promise.all(creations);
}

/**
 * Posts a double-entry balanced journal to the general ledger.
 */
export async function postJournalEntry(
  workspaceId: string,
  params: JournalEntryParams,
  tx?: any
) {
  const client = tx || db;
  const { ledgerDate, referenceType, referenceId, description, lines } = params;

  if (lines.length === 0) {
    throw new Error("Cannot post a journal entry with zero lines.");
  }

  // 1. Verify double-entry balance: Debits must equal Credits
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  // Use a small tolerance for floating-point issues
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `Double-entry imbalance: Total debits (${totalDebit}) must equal total credits (${totalCredit}).`
    );
  }

  // 2. Fetch or auto-bootstrap chart of accounts to ensure all codes exist
  const existingAccounts = await client.chartOfAccounts.findMany({
    where: { workspaceId },
    select: { code: true },
  });

  if (existingAccounts.length === 0) {
    // Auto bootstrap defaults if workspace chart of accounts is empty
    await bootstrapDefaultAccounts(workspaceId, client);
  }

  const activeCodes = new Set(
    (
      await client.chartOfAccounts.findMany({
        where: { workspaceId, isActive: true },
        select: { code: true },
      })
    ).map((acc: { code: string }) => acc.code)
  );

  // Validate that all lines reference valid active accounts
  for (const line of lines) {
    if (!activeCodes.has(line.coaCode)) {
      throw new Error(
        `Account code ${line.coaCode} does not exist or is inactive in this workspace.`
      );
    }
  }

  // 3. Post General Ledger entries
  const entries = await Promise.all(
    lines.map((line) =>
      client.generalLedgerEntry.create({
        data: {
          workspaceId,
          projectId: line.projectId || null,
          wbsCode: line.wbsCode || null,
          coaCode: line.coaCode,
          debit: line.debit,
          credit: line.credit,
          ledgerDate,
          referenceType,
          referenceId,
          description: line.description || description || null,
        },
      })
    )
  );

  return entries;
}

/**
 * Computes the balance of an account in a workspace.
 */
export async function getAccountBalance(workspaceId: string, coaCode: string) {
  const aggregates = await db.generalLedgerEntry.aggregate({
    where: {
      workspaceId,
      coaCode,
    },
    _sum: {
      debit: true,
      credit: true,
    },
  });

  const debit = aggregates._sum.debit || 0;
  const credit = aggregates._sum.credit || 0;
  return debit - credit; // Positive for asset/expense accounts, negative for liability/revenue/equity
}
