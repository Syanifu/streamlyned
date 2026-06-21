"use client";

import React, { useState } from "react";
import { Sparkles, Send, Cpu, User, ArrowRight, CornerDownRight } from "lucide-react";
import { askSuperAdminAiAction } from "@/app/actions/superadmin";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function AskAiView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const suggestedPrompts = [
    "Which projects are at risk this week?",
    "What's the team working on today?",
    "Show me a list of team members and their roles",
    "How many tasks are overdue right now?"
  ];

  const handleSubmit = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const queryText = (customText || input).trim();
    if (!queryText || isLoading) return;

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: queryText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setIsLoading(true);

    try {
      const res = await askSuperAdminAiAction(queryText);
      if (res.success && res.answer) {
        const aiMsg: Message = {
          id: Math.random().toString(),
          sender: "ai",
          text: res.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        toast.error(res.error || "Failed to query AI");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-4xl mx-auto min-h-0 pb-20 sm:pb-24">
      {/* Messages Feed */}
      <div className="flex-1 bg-surface border border-border-custom rounded-xl p-4 sm:p-5 pb-20 sm:pb-24 overflow-y-auto space-y-4 min-h-[300px] sm:min-h-[350px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border border-border-custom rounded-full">
              <Cpu size={28} className="text-neutral-600 dark:text-neutral-400 animate-pulse" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Operational Intelligence
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Query the organization context dynamically. Get answers about project health, resource schedules, and overdue tasks.
              </p>
            </div>

            {/* Suggested Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full pt-4">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(undefined, prompt)}
                  className="p-3 bg-background hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 border border-border-custom hover:border-neutral-400 rounded-xl text-left text-[11px] font-medium text-neutral-600 dark:text-neutral-350 transition-all flex items-center justify-between group"
                >
                  <span>{prompt}</span>
                  <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 text-neutral-600 transition-opacity shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 text-xs p-4 rounded-xl border ${
                  msg.sender === "user"
                    ? "bg-neutral-50/50 border-neutral-200 dark:bg-neutral-900/10 dark:border-neutral-850"
                    : "bg-neutral-50/50 border-neutral-200 dark:bg-neutral-900/20 dark:border-neutral-800"
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 w-8 h-8 flex items-center justify-center border ${
                  msg.sender === "user"
                    ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-200"
                    : "bg-neutral-800 border-neutral-800 text-white dark:bg-white dark:border-white dark:text-neutral-900"
                }`}>
                  {msg.sender === "user" ? <User size={13} /> : <Sparkles size={13} />}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                    <span className="font-bold uppercase tracking-wider">
                      {msg.sender === "user" ? "Super Admin" : "Ashy"}
                    </span>
                    <span>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-250 leading-relaxed whitespace-pre-wrap pt-0.5">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 text-xs p-4 rounded-xl border bg-neutral-50/50 border-neutral-200/50 dark:border-neutral-800/30 animate-pulse">
                <div className="p-1.5 rounded-lg shrink-0 w-8 h-8 flex items-center justify-center bg-neutral-800 border border-neutral-800 text-white dark:bg-white dark:border-white dark:text-neutral-900">
                  <Sparkles size={13} className="animate-spin" />
                </div>
                <div className="space-y-1.5 flex-1 pt-1">
                  <div className="h-2 bg-neutral-200/50 dark:bg-neutral-800/40 rounded w-1/4" />
                  <div className="h-2 bg-neutral-200/30 dark:bg-neutral-800/20 rounded w-3/4" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Box Wrapper */}
      <div className="fixed sm:absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 pb-4 sm:pt-8 sm:pb-6 px-4 sm:px-8 flex justify-center pointer-events-none z-10">
        <form 
          onSubmit={(e) => handleSubmit(e)} 
          className="max-w-2xl w-full bg-surface border border-border-custom p-2.5 sm:p-4 rounded-xl flex gap-2 sm:gap-2.5 items-center shadow-lg pointer-events-auto"
        >
          <CornerDownRight size={14} className="text-neutral-400 shrink-0 hidden sm:block" />
          <input
            type="text"
            required
            placeholder="Ask a question about operations, timelines, or risk areas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-neutral-500 placeholder-neutral-400 text-neutral-800 dark:text-neutral-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-neutral-950 hover:bg-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-lg disabled:opacity-50 shrink-0 transition-colors"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
