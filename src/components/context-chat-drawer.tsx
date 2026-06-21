"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, HelpCircle, Loader2, FileText, CheckSquare, MessageSquare, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  hasKey?: boolean;
  results?: Array<{
    id: string;
    type: string;
    title: string;
    excerpt: string;
    targetUrl: string;
    projectName: string;
    score: number;
  }>;
}

export default function ContextChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your Workspace Context Assistant. Ask me anything about tasks, documents, or chats in this workspace.",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/context-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: userQuery }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer, results: data.results },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Something went wrong. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect to the server. Please check your network." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "TASK":      return <CheckSquare size={13} className="text-neutral-600" />;
      case "DOC":       return <FileText size={13} className="text-neutral-600" />;
      case "CHAT":
      case "COMMENT":   return <MessageSquare size={13} className="text-neutral-600" />;
      default:          return <HelpCircle size={13} className="text-neutral-400" />;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {/* On mobile: sits just above the bottom nav bar (~64px tall + safe-area). On desktop: bottom-right corner */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 md:right-6 bottom-[104px] md:bottom-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-2xl shadow-lg transition-all duration-200 group"
        title="Ask Workspace Assistant"
      >
        <Sparkles size={15} className="text-white animate-pulse shrink-0" />
        <span className="text-xs font-semibold">Ask Ashy</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/10 dark:bg-black/30 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md h-full bg-surface border-l border-border-custom flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 ease-out">
            {/* Header */}
            <div className="h-16 px-6 border-b border-border-custom flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/20 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-neutral-600" />
                <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  Ashy
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                    {msg.role === "user" ? "You" : "Ashy"}
                  </span>
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-neutral-900 text-white dark:bg-neutral-800"
                        : "bg-neutral-50 border border-border-custom text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {msg.role === "assistant" && msg.results && msg.results.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 space-y-2">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Sources & Citations
                        </span>
                        <div className="space-y-1.5">
                          {msg.results.map((res) => (
                            <Link
                              key={res.id}
                              href={res.targetUrl}
                              onClick={() => setIsOpen(false)}
                              className="flex items-center justify-between p-1.5 rounded bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-border-custom text-[10px] text-neutral-600 dark:text-neutral-400 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {getIconForType(res.type)}
                                <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                                  {res.title}
                                </span>
                                <span className="text-neutral-400 dark:text-neutral-500 text-[9px] truncate">
                                  ({res.projectName})
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-1.5 text-neutral-600 dark:text-neutral-400">
                                <span className="font-mono text-[9px]">{Math.round(res.score * 100)}%</span>
                                <ExternalLink size={9} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                      Ashy
                    </span>
                    <div className="bg-neutral-50 border border-border-custom dark:bg-neutral-900/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Loader2 size={13} className="text-neutral-400 animate-spin" />
                      <span className="text-xs text-neutral-600">Searching workspace...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-border-custom bg-neutral-50/30 dark:bg-neutral-900/10 shrink-0"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about this workspace..."
                  disabled={isLoading}
                  className="flex-1 text-xs px-3.5 py-2.5 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
                />
                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
