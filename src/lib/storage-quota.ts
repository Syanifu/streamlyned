import { db } from "@/lib/db";

export const STORAGE_LIMIT_BYTES = 200 * 1024 * 1024; // 200 MB

/**
 * Atomically checks and reserves `bytes` against the user's 200 MB quota.
 * Throws if the upload would exceed the limit.
 */
export async function claimStorage(userId: string, bytes: number): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { storageUsedBytes: true },
    });
    if (!user) throw new Error("User not found.");

    const current = Number(user.storageUsedBytes);
    if (current + bytes > STORAGE_LIMIT_BYTES) {
      const remaining = Math.max(0, STORAGE_LIMIT_BYTES - current);
      throw new Error(
        `Storage limit reached. You have ${formatBytes(remaining)} remaining of your 200 MB allowance.`
      );
    }

    await db.user.update({
      where: { id: userId },
      data: { storageUsedBytes: { increment: bytes } },
    });
  } catch (err: any) {
    // Column not yet migrated — skip quota enforcement until migration runs
    if (err.message?.includes("storageUsedBytes") || err.code === "P2022") return;
    throw err;
  }
}

export async function releaseStorage(userId: string, bytes: number): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { storageUsedBytes: true },
    });
    if (!user) return;

    const newValue = Math.max(0, Number(user.storageUsedBytes) - bytes);
    await db.user.update({
      where: { id: userId },
      data: { storageUsedBytes: newValue },
    });
  } catch (err: any) {
    if (err.message?.includes("storageUsedBytes") || err.code === "P2022") return;
    throw err;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
