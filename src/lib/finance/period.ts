import { db } from "../db";

/**
 * Sets or updates the active period lock date for a workspace.
 */
export async function setPeriodLock(
  workspaceId: string,
  lockDate: Date,
  lockedByUserId: string,
  tx?: any
) {
  const client = tx || db;

  return await client.periodLock.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      lockDate,
      lockedByUserId,
    },
    update: {
      lockDate,
      lockedByUserId,
    },
  });
}

/**
 * Checks if a transaction date is within an open financial period.
 */
export async function checkPeriodOpen(
  workspaceId: string,
  date: Date,
  tx?: any
): Promise<{ open: boolean; lockDate?: Date }> {
  const client = tx || db;

  const lock = await client.periodLock.findUnique({
    where: { workspaceId },
    select: { lockDate: true },
  });

  if (!lock) {
    return { open: true };
  }

  // If transaction date is on or before the locked date, period is CLOSED
  const isClosed = date.getTime() <= lock.lockDate.getTime();

  return {
    open: !isClosed,
    lockDate: lock.lockDate,
  };
}

/**
 * Throws a blocking exception if a transaction date is within a locked period.
 */
export async function assertPeriodOpen(
  workspaceId: string,
  date: Date,
  tx?: any
) {
  const client = tx || db;
  const status = await checkPeriodOpen(workspaceId, date, client);

  if (!status.open && status.lockDate) {
    throw new Error(
      `Transaction block: Date ${date.toDateString()} belongs to a locked financial period (Locked on or before ${status.lockDate.toDateString()}).`
    );
  }
}
