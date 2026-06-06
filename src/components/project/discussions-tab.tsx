"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDiscussionAction, addDiscussionCommentAction } from "@/app/actions/communication";
import { MessageSquare, Plus, ArrowLeft, Send, Pin, Eye, EyeOff } from "lucide-react";
import { toggleClientVisibility } from "@/app/actions/clientmode";

interface DiscussionCompact {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
  comments: any[];
  visibleToClients: boolean;
}

interface DiscussionsTabProps {
  projectId: string;
  selectedId?: string;
  currentUser: any;
  isClient: boolean;
}

export default function DiscussionsTab({
  projectId,
  selectedId,
  currentUser,
  isClient,
}: DiscussionsTabProps) {
  const router = useRouter();
  const [discussions, setDiscussions] = useState<DiscussionCompact[]>([]);
  const [activeDiscussion, setActiveDiscussion] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  // Fetch discussions list or active discussion details
  const loadData = async () => {
    setLoading(true);
    try {
      // Direct call to fetch endpoints
      const res = await fetch(`/api/project/${projectId}/discussions${selectedId ? `?id=${selectedId}` : ""}`);
      const data = await res.json();
      if (selectedId) {
        setActiveDiscussion(data.discussion);
      } else {
        setDiscussions(data.discussions || []);
        setActiveDiscussion(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, selectedId]);

  const handleStartThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSubmitting(true);

    const res = await createDiscussionAction(projectId, newTitle, newContent);
    if (res.success && res.discussion) {
      setNewTitle("");
      setNewContent("");
      setIsCreating(false);
      router.push(`/dashboard/projects/${projectId}?tab=discussions&id=${res.discussion.id}`);
    } else {
      alert(res.error || "Failed to start discussion");
    }
    setIsSubmitting(false);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedId) return;
    setIsCommenting(true);

    const res = await addDiscussionCommentAction(projectId, selectedId, commentText);
    if (res.success) {
      setCommentText("");
      loadData(); // Reload comments
    } else {
      alert(res.error || "Failed to post comment");
    }
    setIsCommenting(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-neutral-400">Loading discussions...</span>
      </div>
    );
  }

  // Active Thread View
  if (selectedId && activeDiscussion) {
    return (
      <div className="flex-1 flex flex-col space-y-6 max-w-3xl mx-auto min-h-0 overflow-y-auto pb-12">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/dashboard/projects/${projectId}?tab=discussions`)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Back to discussions</span>
        </button>

        {/* Thread Content */}
        <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white leading-tight">
                  {activeDiscussion.title}
                </h2>
                {activeDiscussion.isPinned && (
                  <Pin size={12} className="text-indigo-500 fill-indigo-500 shrink-0" />
                )}
                {!isClient && (
                  <button
                    onClick={async () => {
                      const nextVal = !activeDiscussion.visibleToClients;
                      const res = await toggleClientVisibility("DISCUSSION", activeDiscussion.id, nextVal);
                      if (res.success) {
                        setActiveDiscussion({
                          ...activeDiscussion,
                          visibleToClients: nextVal,
                        });
                      } else {
                        alert(res.error || "Failed to toggle visibility");
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-colors ${
                      activeDiscussion.visibleToClients
                        ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100"
                        : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100"
                    }`}
                  >
                    {activeDiscussion.visibleToClients ? (
                      <Eye size={10} className="shrink-0" />
                    ) : (
                      <EyeOff size={10} className="shrink-0" />
                    )}
                    <span>
                      {activeDiscussion.visibleToClients ? "Visible to Client" : "Private to Team"}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-neutral-450">
                Posted by {activeDiscussion.user.name} • {new Date(activeDiscussion.createdAt).toLocaleDateString()}
              </p>
            </div>
            {activeDiscussion.user.avatarUrl && (
              <img
                src={activeDiscussion.user.avatarUrl}
                alt={activeDiscussion.user.name}
                className="w-8 h-8 rounded-full shrink-0"
              />
            )}
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed border-t border-border-custom pt-4 whitespace-pre-wrap">
            {activeDiscussion.content}
          </div>
        </div>

        {/* Replies Heading */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Replies ({activeDiscussion.comments.length})
          </h3>

          {/* List Replies */}
          <div className="space-y-3">
            {activeDiscussion.comments.map((c: any) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border text-xs flex gap-3 ${
                  c.isClientComment
                    ? "bg-amber-50/30 border-l-4 border-l-amber-500 border-amber-100"
                    : "bg-surface border-border-custom"
                }`}
              >
                {c.user.avatarUrl && (
                  <img
                    src={c.user.avatarUrl}
                    alt={c.user.name}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                )}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{c.user.name}</span>
                      {c.isClientComment && (
                        <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 rounded">
                          Client
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-neutral-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <form onSubmit={handlePostReply} className="flex gap-3 bg-surface border border-border-custom p-4 rounded-xl items-start">
            <img
              src={currentUser.avatarUrl || ""}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full shrink-0 mt-1"
            />
            <div className="flex-1 flex gap-2">
              <textarea
                required
                rows={2}
                placeholder="Type your reply..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 resize-none leading-relaxed"
              />
              <button
                type="submit"
                disabled={isCommenting || !commentText.trim()}
                className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg self-end disabled:opacity-50 shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Create Thread Form View
  if (isCreating) {
    return (
      <div className="flex-1 flex flex-col space-y-4 max-w-2xl mx-auto pb-12">
        <button
          onClick={() => setIsCreating(false)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Cancel</span>
        </button>

        <form onSubmit={handleStartThread} className="bg-surface border border-border-custom rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Start a new discussion
          </h2>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="What do you want to talk about?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Discussion content
            </label>
            <textarea
              required
              rows={8}
              placeholder="Write your post here (support markdown formatting)..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 leading-relaxed font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50"
          >
            Post Discussion
          </button>
        </form>
      </div>
    );
  }

  // Discussions List View
  return (
    <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto min-h-0">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Discussion Threads
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium"
        >
          <Plus size={13} />
          <span>New Discussion</span>
        </button>
      </div>

      {/* Threads list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {discussions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border-custom rounded-xl">
            <MessageSquare size={24} className="text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">No discussions started yet.</p>
          </div>
        ) : (
          discussions.map((d) => (
            <div
              key={d.id}
              onClick={() => router.push(`/dashboard/projects/${projectId}?tab=discussions&id=${d.id}`)}
              className={`p-4 bg-surface border hover:border-neutral-400 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                !isClient && !d.visibleToClients
                  ? "border-dashed border-amber-300 dark:border-amber-900/60"
                  : "border-border-custom"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <MessageSquare size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {d.title}
                    </h4>
                    {d.isPinned && (
                      <Pin size={10} className="text-indigo-500 fill-indigo-500 shrink-0" />
                    )}
                    {!isClient && !d.visibleToClients && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-650 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1 py-0.5 rounded border border-amber-200/30">
                        <EyeOff size={8} className="shrink-0" />
                        <span>Private</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Started by {d.user.name} • {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 ml-4 shrink-0">
                <span className="text-[10px] bg-neutral-50 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full font-mono font-medium">
                  {d.comments.length} repl{d.comments.length === 1 ? "y" : "ies"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
