"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, HelpCircle, Loader2, FileText, CheckSquare, MessageSquare, Compass, AlertTriangle, ExternalLink } from "lucide-react";
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
      content: "Hello! I am your Workspace Context Assistant. Ask me anything about tasks, documents, discussion boards, or chats in this workspace.",
    },
  ]);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Check if API settings are configured
  useEffect(() => {
    async function checkSettings() {
      try {
        const response = await fetch("/api/ai/context-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: "test connection query" }),
        });
        const data = await response.json();
        if (typeof data.hasKey === "boolean") {
          setHasApiKey(data.hasKey);
        }
      } catch (err) {
        console.error("Error checking AI settings", err);
      }
    }
    checkSettings();
  }, []);

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
          {
            role: "assistant",
            content: data.answer,
            results: data.results,
          },
        ]);
        if (typeof data.hasKey === "boolean") {
          setHasApiKey(data.hasKey);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Please try again.",
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to the server. Please check your network.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "TASK":
        return <CheckSquare size={13} className="text-blue-500" />;
      case "DOC":
        return <FileText size={13} className="text-emerald-500" />;
      case "DISCUSSION":
        return <Compass size={13} className="text-purple-500" />;
      case "CHAT":
      case "COMMENT":
        return <MessageSquare size={13} className="text-amber-500" />;
      default:
        return <HelpCircle size={13} className="text-neutral-400" />;
    }
  };

  return (
    <>
      {/* Bottom Gemini/Claude-style Input Bar */}
      <div className="w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!query.trim() || isLoading) return;
            setIsOpen(true);
            handleSubmit(e);
          }}
          className="flex items-center gap-3 bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 rounded-2xl px-4 py-3.5 shadow-lg transition-all duration-200 w-full"
        >
          <Sparkles size={18} className="text-brand-accent shrink-0 animate-pulse" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Workspace Assistant... (cites tasks, docs & threads)"
            className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl disabled:opacity-30 transition-colors shrink-0 flex items-center justify-center dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <Send size={13} />
          </button>
        </form>
      </div>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/10 dark:bg-black/30 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-md h-full bg-surface border-l border-border-custom flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 ease-out">
            {/* Header */}
            <div className="h-16 px-6 border-b border-border-custom flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/20 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-brand-accent" />
                <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  Workspace Context Chat
                </h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Warn Banner if API Key is not set */}
            {hasApiKey === false && (
              <div className="px-5 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-100/50 dark:border-amber-950/30 flex items-start gap-2 text-[10px] text-amber-800 dark:text-amber-300 shrink-0">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">AI Settings Incomplete:</span> No custom API key set in Settings. Running queries using mock search simulation.
                </div>
              </div>
            )}

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col gap-1.5 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Sender Badge */}
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                    {msg.role === "user" ? "You" : "Assistant"}
                  </span>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-neutral-900 text-white dark:bg-neutral-800"
                        : "bg-neutral-50 border border-border-custom text-neutral-800 dark:bg-neutral-900/40 dark:text-neutral-200"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Cited Search Results */}
                    {msg.role === "assistant" && msg.results && msg.results.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-neutral-200/60 dark:border-neutral-800/80 space-y-2">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Sources & Citations
                        </span>
                        <div className="space-y-1.5">
                          {msg.results.map((res, rIdx) => (
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
                              <div className="flex items-center gap-1 shrink-0 ml-1.5 text-brand-accent">
                                <span className="font-mono text-[9px]">
                                  {Math.round(res.score * 100)}%
                                </span>
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
                      Assistant
                    </span>
                    <div className="bg-neutral-50 border border-border-custom dark:bg-neutral-900/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Loader2 size={13} className="text-brand-accent animate-spin" />
                      <span className="text-xs text-neutral-500">Searching workspace...</span>
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
