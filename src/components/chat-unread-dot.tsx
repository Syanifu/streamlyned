"use client";

import { useEffect, useState } from "react";
import { hasUnreadChatMessages } from "@/lib/chat-seen";

interface ChatUnreadDotProps {
  projectId: string;
  currentUserId: string;
  latestChatMessageAt: string | null;
}

export default function ChatUnreadDot({
  projectId,
  currentUserId,
  latestChatMessageAt,
}: ChatUnreadDotProps) {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    setUnread(hasUnreadChatMessages(currentUserId, projectId, latestChatMessageAt));
  }, [currentUserId, projectId, latestChatMessageAt]);

  if (!unread) return null;
  return (
    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 inline-block" />
  );
}
