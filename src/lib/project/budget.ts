import { db } from "../db";

export interface BudgetStatus {
  wbsNodeId: string;
  code: string;
  name: string;
  budgetLimit: number;
  committedCost: number;
  actualCost: number;
  remainingBudget: number;
}

/**
 * Retrieves the budget and cost summary for a WBS node.
 */
export async function getWbsNodeBudget(
  wbsNodeId: string,
  tx?: any
): Promise<BudgetStatus> {
  const client = tx || db;

  const node = await client.wbsNode.findUnique({
    where: { id: wbsNodeId },
    select: {
      id: true,
      code: true,
      name: true,
      budgetLimit: true,
      committedCost: true,
      actualCost: true,
    },
  });

  if (!node) {
    throw new Error(`WBS node with ID ${wbsNodeId} not found.`);
  }

  const remainingBudget = node.budgetLimit - (node.committedCost + node.actualCost);

  return {
    wbsNodeId: node.id,
    code: node.code,
    name: node.name,
    budgetLimit: node.budgetLimit,
    committedCost: node.committedCost,
    actualCost: node.actualCost,
    remainingBudget,
  };
}

/**
 * Checks if an additional cost line exceeds the WBS node budget limit.
 */
export async function checkBudgetThreshold(
  wbsNodeId: string,
  additionalAmount: number,
  tx?: any
) {
  const client = tx || db;
  const status = await getWbsNodeBudget(wbsNodeId, client);

  const exposure = status.committedCost + status.actualCost + additionalAmount;
  const allowed = exposure <= status.budgetLimit;

  return {
    allowed,
    remaining: status.remainingBudget,
    budgetLimit: status.budgetLimit,
    exposure,
    code: status.code,
    name: status.name,
  };
}

/**
 * Upserts a WBS Node configuration.
 */
export async function upsertWbsNode(
  projectId: string,
  code: string,
  name: string,
  budgetLimit: number,
  parentCode?: string,
  tx?: any
) {
  const client = tx || db;

  return await client.wbsNode.upsert({
    where: {
      projectId_code: {
        projectId,
        code,
      },
    },
    create: {
      projectId,
      code,
      name,
      budgetLimit,
      parentCode: parentCode || null,
      actualCost: 0,
      committedCost: 0,
    },
    update: {
      name,
      budgetLimit,
      parentCode: parentCode || null,
    },
  });
}
