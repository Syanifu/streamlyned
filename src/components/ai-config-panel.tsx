"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

const DEFAULT_PLACEHOLDER = "You are a focused project management assistant. Be concise and direct.";

export default function AiConfigPanel() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial settings
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/ai/config");
        if (res.ok) {
          const data = await res.json();
          // If the custom prompt is the default placeholder, keep input empty so placeholder shows
          if (data.systemPrompt && data.systemPrompt !== DEFAULT_PLACEHOLDER) {
            setPrompt(data.systemPrompt);
          } else {
            setPrompt("");
          }
        } else {
          toast.error("Failed to load AI configuration");
        }
      } catch (err) {
        console.error("Failed to load AI config", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const promptValue = prompt.trim() || DEFAULT_PLACEHOLDER;

    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ systemPrompt: promptValue }),
      });

      if (res.ok) {
        toast.success("Agent personality updated successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error: Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    toast.success("Reset to default personality");
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border-custom rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] text-neutral-600 dark:text-neutral-400">
        <Loader2 className="animate-spin text-neutral-600 dark:text-neutral-400 mb-2" size={24} />
        <span className="text-xs">Loading operational parameters...</span>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-custom rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
        <Sparkles size={16} className="text-neutral-600" />
        <h2 className="text-sm font-semibold">Ashy Configuration</h2>
      </div>

      <p className="text-xs text-neutral-400 leading-normal">
        Configure Ashy's persona and instructions. This prompt defines how Ashy acts, communicates, and prioritizes workspace tasks.
      </p>

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <label htmlFor="agent-personality" className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Agent personality
            </label>
            <span className={`text-[10px] font-mono ${prompt.length > 900 ? "text-red-500" : "text-neutral-450"}`}>
              {prompt.length}/1000
            </span>
          </div>
          <textarea
            id="agent-personality"
            rows={5}
            maxLength={1000}
            placeholder={DEFAULT_PLACEHOLDER}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full text-xs px-3.5 py-3 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-neutral-500 placeholder-neutral-400 text-neutral-800 dark:text-neutral-100 resize-y min-h-[100px] font-sans leading-relaxed"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={13} />
                <span>Save</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || !prompt}
            className="flex items-center gap-1.5 px-3 py-2 border border-border-custom text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 rounded-lg text-xs transition-colors disabled:opacity-40"
          >
            <RotateCcw size={13} />
            <span>Reset to default</span>
          </button>
        </div>
      </form>
    </div>
  );
}
