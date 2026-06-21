const key = (userId: string, projectId: string) =>
  `chat_seen_${userId}_${projectId}`;

export function markChatSeen(userId: string, projectId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(userId, projectId), new Date().toISOString());
}

export function hasUnreadChatMessages(
  userId: string,
  projectId: string,
  latestMessageAt: string | null
): boolean {
  if (typeof window === "undefined" || !latestMessageAt) return false;
  const raw = localStorage.getItem(key(userId, projectId));
  if (!raw) return true;
  return new Date(latestMessageAt) > new Date(raw);
}

// DM conversation unread tracking (separate namespace from project chatroom)
const dmKey = (userId: string, dmGroupId: string) =>
  `dm_seen_${userId}_${dmGroupId}`;

export function markDmSeen(userId: string, dmGroupId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(dmKey(userId, dmGroupId), new Date().toISOString());
}

export function hasUnreadDmMessages(
  userId: string,
  dmGroupId: string,
  latestMessageAt: string | null
): boolean {
  if (typeof window === "undefined" || !latestMessageAt) return false;
  const raw = localStorage.getItem(dmKey(userId, dmGroupId));
  if (!raw) return true;
  return new Date(latestMessageAt) > new Date(raw);
}
