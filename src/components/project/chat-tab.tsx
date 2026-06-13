"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendChatMessageAction, addChatReactionAction } from "@/app/actions/communication";
import { createCalendarEventAction } from "@/app/actions/calendar";
import { 
  createTaskFromNudgeAction, 
  createAndAssignTaskFromNudgeAction, 
  setDueDateOnNearestTaskAction,
  inferPriorityAction
} from "@/app/actions/nudges";
import { Send, Smile, Paperclip, MessageSquare, Calendar, CheckCircle2, UserPlus, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { PRIORITY_MAP } from "./tasks-tab";

interface ChatMessageCompact {
  id: string;
  content: string;
  createdAt: string;
  user: { 
    id: string; 
    name: string; 
    avatarUrl: string | null;
    memberships?: { role: string }[];
  };
  reactions: { id: string; emoji: string; user: { id: string; name: string } }[];
  files: { id: string; fileName: string; fileUrl: string; fileSize: number }[];
}

interface ChatTabProps {
  projectId: string;
  currentUser: any;
  isClient: boolean;
}

export default function ChatTab({
  projectId,
  currentUser,
  isClient,
}: ChatTabProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageCompact[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [nudges, setNudges] = useState<any[]>([]);
  const [inferredPriority, setInferredPriority] = useState("P4");
  const lastInferredText = useRef("");

  useEffect(() => {
    const text = inputText.trim();
    if (!text) {
      setNudges([]);
      setInferredPriority("P4");
      lastInferredText.current = "";
      return;
    }

    const detected: any[] = [];
    
    // 1. Time / Calendar
    const TIME_REGEX = /\b(at|by|around|before)?\s*(\d{1,2})(:\d{2})?\s*(am|pm)\b/i;
    const DATE_REGEX = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next\s+week)\b/i;
    if (TIME_REGEX.test(text) || DATE_REGEX.test(text)) {
      detected.push({ type: "calendar", label: "Add to Calendar", text });
    }

    // 2. Action / To-Do
    const ACTION_REGEX = /\b(please|can\s+you|could\s+you|make\s+sure|don't\s+forget)\b/i;
    if (ACTION_REGEX.test(text)) {
      detected.push({ 
        type: "task", 
        label: `Create task — ${inferredPriority} ${PRIORITY_MAP[inferredPriority]?.icon || "🔴"}`, 
        text, 
        priority: inferredPriority 
      });
    }

    // 3. Name Tagging / Auto-Assign
    const NAME_REGEX = /@\w+|ask\s+([a-zA-Z]+)/i;
    if (NAME_REGEX.test(text)) {
      const match = text.match(NAME_REGEX);
      const tag = match ? match[0] : "";
      detected.push({ 
        type: "assign", 
        label: `Assign to person — ${inferredPriority} ${PRIORITY_MAP[inferredPriority]?.icon || "🔴"}`, 
        text, 
        tag, 
        priority: inferredPriority 
      });
    }

    // 4. Due Date Nudge
    const DUE_DATE_REGEX = /\b(by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow)|end\s+of\s+week|asap)\b/i;
    if (DUE_DATE_REGEX.test(text)) {
      const match = text.match(DUE_DATE_REGEX);
      const dateText = match ? match[0] : "";
      detected.push({ type: "duedate", label: "Set Due Date", text, dateText });
    }

    setNudges(detected);

    const isAction = ACTION_REGEX.test(text) || NAME_REGEX.test(text);
    if (isAction && text !== lastInferredText.current) {
      const timer = setTimeout(async () => {
        lastInferredText.current = text;
        const res = await inferPriorityAction(text, projectId);
        if (res.success && res.priority !== inferredPriority) {
          setInferredPriority(res.priority);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else if (!isAction) {
      setInferredPriority("P4");
      lastInferredText.current = "";
    }
  }, [inputText, inferredPriority, projectId]);

  const getEventStyles = (priority: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      P1: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-850 dark:text-red-300", border: "border-red-150/45 dark:border-red-950/40" },
      P2: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-850 dark:text-orange-300", border: "border-orange-150/45 dark:border-orange-950/40" },
      P3: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-800 dark:text-yellow-350", border: "border-yellow-150/45 dark:border-yellow-950/40" },
      P4: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-800 dark:text-green-300", border: "border-green-150/45 dark:border-green-950/40" },
      P5: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-800 dark:text-blue-300", border: "border-blue-150/45 dark:border-blue-950/40" },
      P6: { bg: "bg-neutral-50 dark:bg-neutral-900/30", text: "text-neutral-500 dark:text-neutral-400", border: "border-neutral-200 dark:border-neutral-800/50" },
    };
    return map[priority] || map.P4;
  };

  const handleNudgeAction = async (nudge: any) => {
    try {
      if (nudge.type === "calendar") {
        const res = await createCalendarEventAction(projectId, nudge.text);
        if (res.success) {
          toast.success(`Event scheduled: "${res.event?.title}"!`);
        } else {
          toast.error(res.error || "Failed to create event");
        }
      } else if (nudge.type === "task") {
        const res = await createTaskFromNudgeAction(projectId, nudge.text, nudge.priority);
        if (res.success) {
          toast.success(`Task created: "${res.task?.title}"!`);
        } else {
          toast.error(res.error || "Failed to create task");
        }
      } else if (nudge.type === "assign") {
        const res = await createAndAssignTaskFromNudgeAction(projectId, nudge.text, nudge.tag, nudge.priority);
        if (res.success) {
          toast.success(`Task assigned to ${res.assigneeName}!`);
        } else {
          toast.error(res.error || "Failed to assign task");
        }
      } else if (nudge.type === "duedate") {
        const res = await setDueDateOnNearestTaskAction(projectId, nudge.dateText);
        if (res.success) {
          toast.success(`Due date set on task: "${res.taskTitle}"!`);
        } else {
          toast.error(res.error || "Failed to set due date");
        }
      }
      
      // Clear input
      setInputText("");
      setNudges([]);
      setInferredPriority("P4");
      lastInferredText.current = "";
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const getQuickReplies = (msgContent: string) => {
    const content = msgContent.toLowerCase();
    if (content.includes("who")) {
      return ["I'm on it!", "Let me check.", "Marcus is handling it."];
    }
    if (content.includes("when") || content.includes("deadline") || content.includes("ready")) {
      return ["By end of day.", "Tomorrow morning.", "Let me check the timeline."];
    }
    return ["On it!", "Will do.", "Yes, absolutely."];
  };

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isQuestion = !!(lastMessage && lastMessage.user.id !== currentUser.id && lastMessage.content.trim().endsWith("?"));

  // Fetch messages from route handler
  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/chat`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Poll for messages every 3 seconds (lightweight live chat simulation)
  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Scroll to bottom on message load
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsSending(true);

    const res = await sendChatMessageAction(projectId, null, inputText);
    if (res.success) {
      setInputText("");
      loadMessages(true);
    } else {
      alert(res.error || "Failed to send message");
    }
    setIsSending(false);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const res = await addChatReactionAction(messageId, emoji, projectId);
    if (res.success) {
      loadMessages(true);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-neutral-400">Loading chat room...</span>
      </div>
    );
  }

  // Common emojis for reactions
  const reactionEmojis = ["👍", "❤️", "🔥", "🙌", "👀"];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border-custom rounded-xl overflow-hidden max-w-4xl mx-auto h-[600px]">
      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare size={24} className="text-neutral-300 mb-2" />
            <p className="text-xs text-neutral-400">Welcome to the project chat room.</p>
            <p className="text-[10px] text-neutral-400">Messages sent here are visible to all members.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.user.id === currentUser.id;
            const isClientUser = isMe 
              ? isClient 
              : m.user.memberships?.[0]?.role === "CLIENT";
            
            // Group reactions by emoji type
            const reactionsMap: Record<string, typeof m.reactions> = {};
            m.reactions.forEach((r) => {
              if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
              reactionsMap[r.emoji].push(r);
            });

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-xl ${isMe ? "ml-auto flex-row-reverse" : ""}`}
              >
                {/* User Avatar */}
                <img
                  src={m.user.avatarUrl || ""}
                  alt={m.user.name}
                  title={m.user.name}
                  className="w-7 h-7 rounded-full shrink-0"
                />

                {/* Message Bubble */}
                <div className="space-y-1.5 min-w-0">
                  <div className={`flex items-baseline gap-2 ${isMe ? "justify-end" : ""}`}>
                    <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300">
                      {m.user.name}
                    </span>
                    <span className="text-[8px] text-neutral-400 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3 rounded-lg text-xs leading-relaxed text-white ${
                      isClientUser
                        ? "bg-emerald-600 dark:bg-emerald-600 border-transparent"
                        : "bg-blue-600 dark:bg-blue-600 border-transparent"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {/* Message Reactions Row */}
                  <div className={`flex flex-wrap items-center gap-1.5 mt-1 group ${isMe ? "justify-end" : ""}`}>
                    {/* Active reactions */}
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

                    {/* Reaction Adder (shows on hover) */}
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

      {/* Smart Suggested Replies */}
      {isQuestion && lastMessage && (
        <div className="px-6 py-2 bg-neutral-50/50 dark:bg-neutral-900/30 border-t border-border-custom flex flex-wrap gap-2 items-center shrink-0">
          <span className="text-[9px] text-neutral-450 uppercase font-bold tracking-wider mr-1">
            Quick Reply:
          </span>
          {getQuickReplies(lastMessage.content).map((replyText) => (
            <button
              key={replyText}
              type="button"
              onClick={async () => {
                setIsSending(true);
                const res = await sendChatMessageAction(projectId, null, replyText);
                setIsSending(false);
                if (res.success) {
                  loadMessages(true);
                } else {
                  alert(res.error || "Failed to send reply");
                }
              }}
              className="px-2.5 py-1 bg-surface border border-border-custom hover:border-indigo-400 dark:hover:border-indigo-900 rounded-lg text-[10px] font-medium text-neutral-600 dark:text-neutral-350 hover:text-indigo-650 transition-colors shadow-2xs"
            >
              {replyText}
            </button>
          ))}
        </div>
      )}

      {/* Message input panel */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-border-custom bg-surface flex flex-col gap-2.5 shrink-0"
      >
        {/* Inline Smart Nudge Chips */}
        {nudges.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in slide-in-from-bottom-1 duration-200">
            {nudges.map((nudge) => {
              let Icon = Calendar;
              if (nudge.type === "task") Icon = CheckCircle2;
              if (nudge.type === "assign") Icon = UserPlus;
              if (nudge.type === "duedate") Icon = Clock;

              const isPriorityNudge = nudge.type === "task" || nudge.type === "assign";
              const styles = isPriorityNudge 
                ? getEventStyles(nudge.priority || "P4")
                : { bg: "bg-indigo-50 dark:bg-indigo-950/20", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-150/45" };

              return (
                <button
                  key={nudge.type}
                  type="button"
                  onClick={() => handleNudgeAction(nudge)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 ${styles.bg} ${styles.text} border ${styles.border} rounded-full text-[10px] font-bold uppercase tracking-wider hover:brightness-95 transition-all`}
                >
                  <Icon size={12} className="shrink-0" />
                  <span>{nudge.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 relative flex items-center border border-border-custom rounded-lg overflow-hidden focus-within:border-brand-accent">
            <input
              type="text"
              required
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 focus:outline-none bg-transparent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
            />
            
            <button
              type="button"
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded mr-2"
              title="Attach files (5GB limit)"
            >
              <Paperclip size={14} />
            </button>
          </div>

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg disabled:opacity-50 transition-colors shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
