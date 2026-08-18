"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getStockBalance } from "@/lib/inventory/ledger";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER INVENTORY ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getMasterInventoryData() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    const [items, suppliers, movements] = await Promise.all([
      db.itemMaster.findMany({
        where: { workspaceId },
        orderBy: { code: "asc" },
      }),
      db.supplierMaster.findMany({
        where: { workspaceId },
        orderBy: { code: "asc" },
      }),
      db.inventoryMovement.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        include: {
          wbsNode: {
            include: {
              project: true,
            },
          },
        },
      }),
    ]);

    // Recalculate moving average stock balance for each item
    const stockBalances = [];
    let totalValuation = 0;
    let reorderBreachesCount = 0;

    for (const item of items) {
      const bal = await getStockBalance(workspaceId, item.code, "MAIN");
      const value = bal.quantity * bal.rate;
      totalValuation += Math.max(0, value);

      const breached = item.reorderLevel !== null && bal.quantity < item.reorderLevel;
      if (breached) {
        reorderBreachesCount++;
      }

      stockBalances.push({
        id: item.id,
        code: item.code,
        name: item.name,
        uom: item.uom,
        group: item.group,
        onHand: bal.quantity,
        macRate: bal.rate,
        totalValue: Math.max(0, value),
        reorderLevel: item.reorderLevel || 0,
        breached,
      });
    }

    return {
      success: true,
      items: stockBalances,
      suppliers,
      movements: movements.map((m) => ({
        id: m.id,
        itemCode: m.itemCode,
        type: m.type,
        quantity: m.quantity,
        rate: m.rate,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        warehouse: m.warehouse,
        projectName: m.wbsNode?.project.name || "N/A",
        createdAt: m.createdAt.toISOString(),
      })),
      summary: {
        totalItems: items.length,
        totalValuation,
        reorderBreachesCount,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createItemMasterAction(
  code: string,
  name: string,
  uom: string,
  group: string,
  reorderLevel: number
) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    await db.itemMaster.create({
      data: {
        workspaceId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        uom: uom.trim().toUpperCase(),
        group: group.trim().toUpperCase(),
        reorderLevel,
        reorderQty: reorderLevel * 2,
      },
    });

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createSupplierMasterAction(
  code: string,
  name: string,
  gstin: string,
  creditLimit: number
) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    await db.supplierMaster.create({
      data: {
        workspaceId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        gstin: gstin.trim().toUpperCase(),
        isActive: true,
      },
    });

    revalidatePath("/dashboard/inventory");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MASTER ACCOUNTS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getMasterAccountsData() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    const [coa, ledgerEntries, purchaseInvoices, salesBills, projects] = await Promise.all([
      db.chartOfAccounts.findMany({
        where: { workspaceId },
        orderBy: { code: "asc" },
      }),
      db.generalLedgerEntry.findMany({
        where: { workspaceId },
        orderBy: { ledgerDate: "desc" },
      }),
      db.purchaseInvoice.findMany({
        where: { workspaceId },
        orderBy: { invoiceDate: "desc" },
      }),
      db.raBill.findMany({
        where: { workspaceId },
        orderBy: { billingDate: "desc" },
        include: {
          project: {
            select: { name: true },
          },
        },
      }),
      db.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true },
      }),
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p.name]));

    // Calculate debit / credit totals
    let totalDebit = 0;
    let totalCredit = 0;
    ledgerEntries.forEach((e) => {
      totalDebit += e.debit;
      totalCredit += e.credit;
    });

    // Net Cash Flow = sum of sales bills collections - purchase invoice payments
    const certifiedRevenue = salesBills
      .filter((b) => b.status === "CERTIFIED" || b.status === "PAID")
      .reduce((sum, b) => sum + b.cumulativeCertified, 0);

    const paidPurchases = purchaseInvoices
      .filter((i) => i.status === "APPROVED" || i.status === "MATCHED")
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const netCashFlow = certifiedRevenue - paidPurchases;

    return {
      success: true,
      coa,
      ledgerEntries: ledgerEntries.map((e) => ({
        id: e.id,
        coaCode: e.coaCode,
        debit: e.debit,
        credit: e.credit,
        ledgerDate: e.ledgerDate.toISOString(),
        referenceType: e.referenceType,
        referenceId: e.referenceId,
      })),
      purchaseInvoices: purchaseInvoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        supplierCode: i.supplierCode,
        status: i.status,
        totalAmount: i.totalAmount,
        invoiceDate: i.invoiceDate.toISOString(),
        projectName: projectMap.get(i.projectId) || "N/A",
      })),
      salesInvoices: salesBills.map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        status: b.status,
        totalAmount: b.cumulativeCertified,
        invoiceDate: b.billingDate.toISOString(),
        projectName: b.project.name,
      })),
      summary: {
        totalDebit,
        totalCredit,
        netCashFlow,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createChartOfAccountsAction(code: string, name: string, type: string) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    await db.chartOfAccounts.create({
      data: {
        workspaceId,
        code: code.trim(),
        name: name.trim(),
        type: type.trim().toUpperCase(),
        isActive: true,
      },
    });

    revalidatePath("/dashboard/accounts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MASTER PAYROLL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getMasterPayrollData() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    const [employees, salarySlips] = await Promise.all([
      db.employee.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
      }),
      db.salarySlip.findMany({
        where: { workspaceId },
        orderBy: { month: "desc" },
        include: {
          employee: {
            select: { name: true, designation: true },
          },
        },
      }),
    ]);

    const totalEmployees = employees.length;
    const totalPayrollExpense = salarySlips
      .filter((s) => s.status === "PAID" || s.status === "SUBMITTED")
      .reduce((sum, s) => sum + s.netPaid, 0);

    const totalStatutoryDeductions = salarySlips
      .filter((s) => s.status === "PAID" || s.status === "SUBMITTED")
      .reduce((sum, s) => sum + s.statutoryDeductions, 0);

    return {
      success: true,
      employees,
      salarySlips: salarySlips.map((s) => ({
        id: s.id,
        employeeName: s.employee.name,
        designation: s.employee.designation,
        month: s.month,
        basicSalary: s.basicSalary,
        statutoryDeductions: s.statutoryDeductions,
        netPaid: s.netPaid,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      summary: {
        totalEmployees,
        totalPayrollExpense,
        totalStatutoryDeductions,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function onboardEmployeeAction(
  name: string,
  email: string,
  designation: string,
  costRatePerHour: number
) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    await db.employee.create({
      data: {
        workspaceId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        designation: designation.trim(),
        costRatePerHour,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function runMonthlyPayrollAction(month: string) {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    const employees = await db.employee.findMany({
      where: { workspaceId, isActive: true },
    });

    if (employees.length === 0) {
      throw new Error("No active employees found in the directory.");
    }

    let runsCount = 0;
    await db.$transaction(async (tx) => {
      for (const emp of employees) {
        // Check if salary slip already generated
        const existing = await tx.salarySlip.findUnique({
          where: {
            employeeId_month: {
              employeeId: emp.id,
              month,
            },
          },
        });
        if (existing) continue;

        // Base salary calculation (default ₹ 45,000 basic, PF/ESI of 12% basic)
        const basic = 45000;
        const deductions = parseFloat((basic * 0.12).toFixed(2));
        const netPaid = basic - deductions;

        await tx.salarySlip.create({
          data: {
            workspaceId,
            employeeId: emp.id,
            month,
            basicSalary: basic,
            statutoryDeductions: deductions,
            netPaid,
            status: "PAID",
          },
        });
        runsCount++;
      }
    });

    revalidatePath("/dashboard/payroll");
    return { success: true, count: runsCount };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
