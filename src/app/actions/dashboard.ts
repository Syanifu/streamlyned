"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getStockBalance } from "@/lib/inventory/ledger";
import { checkLowInventory } from "@/lib/analytics/engine";

export interface WorkspaceDashboardStats {
  totalProjects: number;
  activeTasks: number;
  totalRevenue: number;
  purchaseValue: number;
  inventoryValue: number;
  grossProfit: number;
  projectBreakdown: {
    completed: number;
    onTrack: number;
    atRisk: number;
    delayed: number;
    total: number;
  };
  topProjects: {
    id: string;
    name: string;
    budget: number;
    actual: number;
    utilization: number;
    status: string;
  }[];
  criticalAlerts: {
    id: string;
    type: "DELAY" | "LOW_STOCK" | "QC_HOLD" | "OVERDUE_TASK";
    title: string;
    message: string;
    timeLabel: string;
  }[];
  pendingApprovals: {
    id: string;
    signoffId: string;
    type: string;
    title: string;
    requestedBy: string;
    amount?: number;
    timeLabel: string;
  }[];
  overdueTasks: {
    id: string;
    title: string;
    projectName: string;
    daysOverdue: number;
  }[];
}

export async function getWorkspaceDashboardStats(): Promise<{
  success: boolean;
  stats?: WorkspaceDashboardStats;
  error?: string;
}> {
  try {
    const session = await requireSession();
    const workspaceId = session.workspace.id;

    // 1. Projects Count & Fetch
    const projects = await db.project.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        wbsNodes: true,
        members: true,
      },
    });
    const totalProjects = projects.length;

    // 2. Active Tasks Count
    const activeTasks = await db.task.count({
      where: {
        workspaceId,
        isCompleted: false,
      },
    });

    // 3. Total Revenue (Certified RA Bills)
    const certifiedBills = await db.raBill.findMany({
      where: { workspaceId, status: "CERTIFIED" },
      select: { cumulativeCertified: true },
    });
    const totalRevenue = certifiedBills.reduce((sum, b) => sum + b.cumulativeCertified, 0);

    // 4. Purchase Value (All approved POs)
    const approvedPos = await db.purchaseOrder.findMany({
      where: { workspaceId, status: "APPROVED" },
      select: { totalAmount: true },
    });
    const purchaseValue = approvedPos.reduce((sum, p) => sum + p.totalAmount, 0);

    // 5. Inventory Value (Chronological Moving Average balance method)
    const distinctMovements = await db.inventoryMovement.findMany({
      where: { workspaceId },
      select: { itemCode: true },
      distinct: ["itemCode"],
    });

    let inventoryValue = 0;
    for (const mov of distinctMovements) {
      const bal = await getStockBalance(workspaceId, mov.itemCode, "MAIN");
      if (bal.quantity > 0) {
        inventoryValue += bal.quantity * bal.rate;
      }
    }

    // 6. Calculate Gross Profit (Revenue - Material Issues - Labor Costs - Equipment Costs)
    // Fetch Material Issues from Inventory Movements (ISSUE)
    const issueMovements = await db.inventoryMovement.findMany({
      where: { workspaceId, type: "ISSUE" },
      select: { quantity: true, rate: true },
    });
    const totalMaterialCost = issueMovements.reduce(
      (sum, m) => sum + Math.abs(m.quantity) * m.rate,
      0
    );

    // Fetch Labour hours from Daily Progress Reports
    const labourLines = await db.dprLabourLine.findMany({
      where: { dpr: { workspaceId } },
      select: { headcount: true, hours: true, ratePerHour: true },
    });
    const totalLabourCost = labourLines.reduce(
      (sum, l) => sum + l.headcount * l.hours * l.ratePerHour,
      0
    );

    // Fetch Equipment hours from Daily Progress Reports
    const equipmentLines = await db.dprEquipmentLine.findMany({
      where: { dpr: { workspaceId } },
      select: { runningHours: true, ratePerHour: true },
    });
    const totalEquipmentCost = equipmentLines.reduce(
      (sum, e) => sum + e.runningHours * e.ratePerHour,
      0
    );

    // Gross Profit = Total Revenue (Certified claims) - Actual Costs incurred
    const actualProjectCosts = totalMaterialCost + totalLabourCost + totalEquipmentCost;
    const grossProfit = Math.max(0, totalRevenue - actualProjectCosts);

    // 7. Project Progress Breakdown
    let completed = 0;
    let onTrack = 0;
    let atRisk = 0;
    let delayed = 0;

    for (const p of projects) {
      if (p.isArchived) {
        completed++;
        continue;
      }
      // Check for active NCs (Non Conformance Reports)
      const ncCount = await db.nonConformanceReport.count({
        where: { wbsNode: { projectId: p.id }, status: "OPEN" },
      });
      if (ncCount > 0) {
        atRisk++;
      } else {
        // Check if there are overdue tasks in this project
        const overdueCount = await db.task.count({
          where: {
            projectId: p.id,
            isCompleted: false,
            dueDateEnd: { lt: new Date() },
          },
        });
        if (overdueCount > 0) {
          delayed++;
        } else {
          onTrack++;
        }
      }
    }

    // 8. Top 5 Projects by Budget Utilization
    const topProjects = projects
      .map((p) => {
        const budget = p.wbsNodes.reduce((sum, n) => sum + (n.budgetLimit || 0), 0);
        const actual = p.wbsNodes.reduce((sum, n) => sum + (n.actualCost || 0), 0);
        const pct = budget > 0 ? (actual / budget) * 100 : 0;
        let status = "On Track";
        if (pct > 100) status = "Over Budget";
        else if (pct > 90) status = "At Risk";
        return {
          id: p.id,
          name: p.name,
          budget,
          actual,
          utilization: parseFloat(pct.toFixed(1)),
          status,
        };
      })
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5);

    // 9. Critical Alerts scanning
    const criticalAlerts: WorkspaceDashboardStats["criticalAlerts"] = [];

    // Low stock warnings
    const lowStock = await checkLowInventory(workspaceId);
    lowStock.forEach((ls, i) => {
      criticalAlerts.push({
        id: `low-stock-${i}`,
        type: "LOW_STOCK",
        title: `Low Stock Alert: ${ls.name}`,
        message: `${ls.itemCode} has dropped to ${ls.currentStock} units (Reorder limit: ${ls.reorderLevel})`,
        timeLabel: "Just now",
      });
    });

    // Active NCRs
    const openNcrs = await db.nonConformanceReport.findMany({
      where: { workspaceId, status: "OPEN" },
      include: { wbsNode: { include: { project: true } } },
      take: 5,
    });
    openNcrs.forEach((ncr) => {
      criticalAlerts.push({
        id: ncr.id,
        type: "QC_HOLD",
        title: `QC Hold: ${ncr.wbsNode.project.name}`,
        message: `NCR open on ${ncr.wbsNode.code}: ${ncr.description || "Defects found"}`,
        timeLabel: "Active Hold",
      });
    });

    // Overdue Tasks
    const overdueTasksList = await db.task.findMany({
      where: {
        workspaceId,
        isCompleted: false,
        dueDateEnd: { lt: new Date() },
      },
      include: {
        taskList: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { dueDateEnd: "asc" },
      take: 5,
    });
    overdueTasksList.forEach((task) => {
      criticalAlerts.push({
        id: task.id,
        type: "OVERDUE_TASK",
        title: `Overdue Task: ${task.title}`,
        message: `Assigned task in ${task.taskList.project.name} is past its target due date.`,
        timeLabel: "Overdue",
      });
    });

    // 10. Pending Approvals
    const approvals = await db.approvalRequest.findMany({
      where: { workspaceId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        signoffs: {
          where: { status: "PENDING" },
          orderBy: { step: "asc" },
        },
      },
      take: 5,
    });
    const pendingApprovals = approvals.map((a) => {
      const activeSignoff = a.signoffs[0];
      return {
        id: a.id,
        signoffId: activeSignoff?.id || "",
        type: a.documentType, // e.g. PO | MATERIAL_REQ | RA_BILL
        title: `Approval Request: ${a.documentType}`,
        requestedBy: "Project Engineer",
        amount: a.amount,
        timeLabel: "Pending review",
      };
    });

    // 11. Overdue Tasks summary
    const overdueTasks = overdueTasksList.map((t) => {
      const diffTime = Math.abs(new Date().getTime() - new Date(t.dueDateEnd!).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: t.id,
        title: t.title,
        projectName: t.taskList.project.name,
        daysOverdue: diffDays,
      };
    });

    return {
      success: true,
      stats: {
        totalProjects,
        activeTasks,
        totalRevenue,
        purchaseValue,
        inventoryValue,
        grossProfit,
        projectBreakdown: {
          completed,
          onTrack,
          atRisk,
          delayed,
          total: totalProjects,
        },
        topProjects,
        criticalAlerts,
        pendingApprovals,
        overdueTasks,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
