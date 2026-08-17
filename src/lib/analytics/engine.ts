import { db } from "../db";
import { getStockBalance } from "../inventory/ledger";

export interface ProjectEvmMetrics {
  projectId: string;
  plannedValue: number;  // PV = Sum of all WBS Node budget limits
  actualCost: number;    // AC = Sum of all WBS Node actual costs
  earnedValue: number;   // EV = Sum of certified cumulative RA bill values
  cpi: number;           // Cost Performance Index = EV / AC
  spi: number;           // Schedule Performance Index = EV / PV
  status: string;        // UNDER_BUDGET_AHEAD | OVER_BUDGET_BEHIND | etc.
}

/**
 * Computes the Earned Value Management (EVM) metrics for a project.
 */
export async function calculateProjectEVM(projectId: string, tx?: any): Promise<ProjectEvmMetrics> {
  const client = tx || db;

  // 1. Calculate Planned Value (PV) & Actual Cost (AC) from WBS Nodes
  const wbsNodes = await client.wbsNode.findMany({
    where: { projectId },
    select: { budgetLimit: true, actualCost: true },
  });

  const plannedValue = wbsNodes.reduce((sum: number, node: any) => sum + node.budgetLimit, 0);
  const actualCost = wbsNodes.reduce((sum: number, node: any) => sum + node.actualCost, 0);

  // 2. Calculate Earned Value (EV) from certified client RA Bills
  const certifiedBills = await client.raBill.findMany({
    where: {
      projectId,
      status: "CERTIFIED",
    },
    select: { cumulativeCertified: true },
    orderBy: { billingDate: "desc" },
    take: 1, // The latest certified bill has the cumulative value
  });

  const earnedValue = certifiedBills[0]?.cumulativeCertified || 0;

  // 3. Compute Indexes
  const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;
  const spi = plannedValue > 0 ? earnedValue / plannedValue : 1.0;

  // Determine status flag
  let status = "ON_TRACK";
  if (cpi < 1.0 && spi < 1.0) {
    status = "OVER_BUDGET_BEHIND_SCHEDULE";
  } else if (cpi >= 1.0 && spi >= 1.0) {
    status = "UNDER_BUDGET_AHEAD_OF_SCHEDULE";
  } else if (cpi < 1.0) {
    status = "OVER_BUDGET_AHEAD_OF_SCHEDULE";
  } else if (spi < 1.0) {
    status = "UNDER_BUDGET_BEHIND_SCHEDULE";
  }

  return {
    projectId,
    plannedValue,
    actualCost,
    earnedValue,
    cpi: parseFloat(cpi.toFixed(3)),
    spi: parseFloat(spi.toFixed(3)),
    status,
  };
}

export interface InventoryWarning {
  itemCode: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
}

/**
 * Scans the item master register and flags items whose stock has dropped below reorder levels.
 */
export async function checkLowInventory(workspaceId: string, tx?: any): Promise<InventoryWarning[]> {
  const client = tx || db;

  // Fetch all active items
  const items = await client.itemMaster.findMany({
    where: { workspaceId, isActive: true },
    select: { code: true, name: true, reorderLevel: true },
  });

  const warnings: InventoryWarning[] = [];

  for (const item of items) {
    const stock = await getStockBalance(workspaceId, item.code, "MAIN", client);

    if (stock.quantity < item.reorderLevel) {
      warnings.push({
        itemCode: item.code,
        name: item.name,
        currentStock: stock.quantity,
        reorderLevel: item.reorderLevel,
      });
    }
  }

  return warnings;
}
