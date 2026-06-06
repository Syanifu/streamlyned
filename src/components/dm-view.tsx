"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessageAction, addChatReactionAction, createDmGroupAction } from "@/app/actions/communication";
import { MessageSquare, Plus, Send, X, ShieldAlert, Check } from "lucide-react";

interface UserCompact {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface DmGroupCompact {
  id: string;
  members: { user: UserCompact }[];
  messages: { content: string; createdAt: Date; user: { name: string } }[];
}

interface DmViewProps {
  currentUser: any;
  workspaceSlug: string;
  dmGroups: any[];
  workspaceUsers: UserCompact[];
  selectedGroup: any;
  initialMessages: any[];
}

export default function DmView({
  currentUser,
  workspaceSlug,
  dmGroups = [],
  workspaceUsers = [],
  selectedGroup,
  initialMessages = [],
}: DmViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);

  // Modal State for starting DMs
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreatingDm, setIsCreatingDm] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update local messages when initialMessages prop updates
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Dynamic DM polling (every 3 seconds)
  useEffect(() => {
    if (!selectedGroup) return;

    const pollMessages = async () => {
      try {
        const res = await fetch(`/api/dm/${selectedGroup.id}`);
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (e) {
        console.error(e);
      }
    };

    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedGroup]);

  // Scroll to bottom on message updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedGroup) return;
    setIsSending(true);

    const res = await sendChatMessageAction(null, selectedGroup.id, inputText);
    if (res.success) {
      setInputText("");
      // Add local message instantly before poll catches up
      if (res.message) {
        const mockMsg = {
          ...res.message,
          user: currentUser,
          reactions: [],
          files: [],
        };
        setMessages((prev) => [...prev, mockMsg]);
      }
    } else {
      alert(res.error || "Failed to send DM");
    }
    setIsSending(false);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedGroup) return;
    const res = await addChatReactionAction(messageId, emoji, null);
    if (res.success) {
      // Reload instantly
      const fetchRes = await fetch(`/api/dm/${selectedGroup.id}`);
      const data = await fetchRes.json();
      if (data.messages) setMessages(data.messages);
    }
  };

  const handleStartDm = async () => {
    if (selectedUserIds.length === 0) return;
    setIsCreatingDm(true);

    // Get emails of chosen users
    const emails = workspaceUsers
      .filter((u) => selectedUserIds.includes(u.id))
      .map((u) => u.email);

    const res = await createDmGroupAction(emails);
    if (res.success && res.dmGroupId) {
      setSelectedUserIds([]);
      setShowNewDmModal(false);
      router.push(`/dashboard/dm?id=${res.dmGroupId}`);
    } else {
      alert(res.error || "Failed to start conversation");
    }
    setIsCreatingDm(false);
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      if (selectedUserIds.length >= 11) {
        alert("Direct Messages can have at most 12 participants (including you).");
        return;
      }
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const reactionEmojis = ["👍", "❤️", "🔥", "🙌", "👀"];

  return (
    <div className="flex-1 flex gap-6 overflow-hidden min-h-0 bg-surface border border-border-custom rounded-xl h-[600px]">
      {/* Sidebar: Conversations List */}
      <div className="w-72 border-r border-border-custom flex flex-col justify-between shrink-0">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-4 border-b border-border-custom flex items-center justify-between shrink-0">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Conversations
            </span>
            <button
              onClick={() => setShowNewDmModal(true)}
              className="p-1 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-800 rounded border border-border-custom"
              title="Start new conversation"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* DM Groups List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dmGroups.length === 0 ? (
              <p className="text-xs text-neutral-400 italic p-4 text-center">No active chats.</p>
            ) : (
              dmGroups.map((g) => {
                const otherMembers = g.members.filter((m: any) => m.user.id !== currentUser.id);
                const displayNames = otherMembers.map((m: any) => m.user.name.split(" ")[0]).join(", ");
                const lastMsg = g.messages[0];
                const isSelected = selectedGroup?.id === g.id;

                return (
                  <button
                    key={g.id}
                    onClick={() => router.push(`/dashboard/dm?id=${g.id}`)}
                    className={`w-full text-left p-3 rounded-lg flex flex-col gap-1 text-xs border ${
                      isSelected
                        ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                        : "bg-transparent border-transparent text-neutral-500 hover:bg-neutral-50/50"
                    }`}
                  >
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {displayNames || "Only You"}
                    </span>
                    {lastMsg ? (
                      <p className="text-[10px] text-neutral-400 truncate">
                        <span className="font-medium text-neutral-500">{lastMsg.user.name.split(" ")[0]}:</span> {lastMsg.content}
                      </p>
                    ) : (
                      <p className="text-[10px] text-neutral-400 italic">No messages yet</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Area: Selected Conversation Chat Room */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedGroup ? (
          <div className="flex-1 flex flex-col min-h-0 justify-between">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <MessageSquare size={24} className="text-neutral-300 mb-2" />
                  <p className="text-xs text-neutral-400">Direct Message started.</p>
                  <p className="text-[10px] text-neutral-400">This conversation is private to members.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.user.id === currentUser.id;

                  // Group reactions
                  const reactionsMap: Record<string, any[]> = {};
                  m.reactions.forEach((r: any) => {
                    if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
                    reactionsMap[r.emoji].push(r);
                  });

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-3 max-w-xl ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <img
                        src={m.user.avatarUrl || ""}
                        alt={m.user.name}
                        className="w-7 h-7 rounded-full shrink-0"
                      />

                      <div className="space-y-1 min-w-0">
                        <div className={`flex items-baseline gap-2 ${isMe ? "justify-end" : ""}`}>
                          <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                            {m.user.name}
                          </span>
                          <span className="text-[8px] text-neutral-400 font-mono">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            isMe
                              ? "bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100"
                              : "bg-neutral-50 dark:bg-neutral-900 border border-border-custom text-neutral-800 dark:text-neutral-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        </div>

                        {/* Reactions */}
                        <div className={`flex flex-wrap items-center gap-1.5 mt-1 group ${isMe ? "justify-end" : ""}`}>
                          {Object.entries(reactionsMap).map(([emoji, reacts]) => {
                            const hasReacted = reacts.some((r) => r.user.id === currentUser.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(m.id, emoji)}
                                className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 font-mono transition-colors ${
                                  hasReacted
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                    : "bg-neutral-50 border-border-custom text-neutral-500 hover:bg-neutral-100"
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-semibold">{reacts.length}</span>
                              </button>
                            );
                          })}

                          {/* Emoji Palette */}
                          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity ml-1 bg-surface border border-border-custom rounded-full px-1 py-0.5 shadow-sm">
                            {reactionEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(m.id, emoji)}
                                className="hover:scale-125 px-0.5 text-[10px] transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 border-t border-border-custom bg-surface flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                required
                placeholder="Type your private message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 border border-border-custom rounded-lg focus:outline-none focus:border-brand-accent bg-transparent placeholder-neutral-400"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg disabled:opacity-50 transition-colors shrink-0"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        ) : (
          /* Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-400">
            <MessageSquare size={28} className="text-neutral-300 mb-2" />
            <p className="text-xs">No conversation active</p>
            <p className="text-[10px] mt-1">Select a participant thread or click "+" to launch a DM group.</p>
          </div>
        )}
      </div>

      {/* Start New DM Modal Overlay */}
      {showNewDmModal && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-border-custom rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                New Direct Message
              </span>
              <button
                onClick={() => setShowNewDmModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-[10px] text-neutral-400 leading-normal">
              Select members to start a conversation. You can add up to 11 members to form a group.
            </p>

            {/* List users with checkboxes */}
            <div className="max-h-48 overflow-y-auto border border-border-custom rounded-lg divide-y divide-border-custom p-1">
              {workspaceUsers.length === 0 ? (
                <p className="text-xs text-neutral-400 italic p-3 text-center">No other members in workspace</p>
              ) : (
                workspaceUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-colors text-xs text-left"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={u.avatarUrl || ""}
                          alt={u.name}
                          className="w-6 h-6 rounded-full bg-neutral-200"
                        />
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{u.name}</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-border-custom"
                        }`}
                      >
                        {isChecked && <Check size={10} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewDmModal(false)}
                className="px-3 py-1.5 border border-border-custom text-neutral-500 rounded-lg text-xs hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartDm}
                disabled={isCreatingDm || selectedUserIds.length === 0}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
