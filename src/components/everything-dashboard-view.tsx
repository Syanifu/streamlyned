"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  Filter,
  Search,
  Paperclip,
  User,
  ArrowRight,
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
}

interface CommentFeedItem {
  id: string;
  content: string;
  createdAt: string;
  isClientComment: boolean;
  user: { name: string; avatarUrl: string | null };
  parentType: "TASK" | "DISCUSSION" | "DOC";
  parentName: string;
  parentId: string;
  projectId: string;
}

interface DocFeedItem {
  id: string;
  title: string;
  updatedAt: string;
  projectId: string;
}

interface AttachmentFeedItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  taskName: string;
  taskId: string;
  projectId: string;
}

interface EverythingDashboardViewProps {
  projects: ProjectItem[];
  comments: CommentFeedItem[];
  docs: DocFeedItem[];
  attachments: AttachmentFeedItem[];
  isClient: boolean;
}

export default function EverythingDashboardView({
  projects,
  comments,
  docs,
  attachments,
  isClient,
}: EverythingDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"comments" | "files">("comments");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getProjectName = (pId: string) => {
    return projects.find((p) => p.id === pId)?.name || "Unknown Project";
  };

  const getParentTabLabel = (type: "TASK" | "DISCUSSION" | "DOC") => {
    if (type === "TASK") return "tasks";
    if (type === "DISCUSSION") return "discussions";
    return "docs";
  };

  // Filter Logic
  const filterByProject = <T extends { projectId: string }>(items: T[]): T[] => {
    return selectedProjectId === "all"
      ? items
      : items.filter((item) => item.projectId === selectedProjectId);
  };

  const filterBySearch = <T extends Record<string, any>>(
    items: T[],
    fields: (keyof T)[]
  ): T[] => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        if (typeof val === "string") return val.toLowerCase().includes(query);
        if (val && typeof val === "object" && "name" in val) {
          return (val.name as string).toLowerCase().includes(query);
        }
        return false;
      })
    );
  };

  // Filtered lists
  const filteredComments = filterBySearch(
    filterByProject(comments),
    ["content", "parentName", "user"]
  );

  const filteredDocs = filterBySearch(filterByProject(docs), ["title"]);
  const filteredAttachments = filterBySearch(
    filterByProject(attachments),
    ["fileName", "taskName"]
  );

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-surface border border-border-custom px-4 py-3 rounded-xl shadow-xs">
        {/* Project Selector */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter size={14} className="text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:inline">
            Project:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs bg-surface border border-border-custom rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-200 w-full sm:w-auto"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Text Search */}
        <div className="relative w-full sm:w-72">
          <Search size={13} className="absolute left-3.5 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search feed items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-background border border-border-custom rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex justify-between items-center shrink-0 border-b border-border-custom pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("comments")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "comments"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-500 hover:text-foreground"
            }`}
          >
            <MessageSquare size={13} />
            <span>Comments Stream ({filteredComments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "files"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-500 hover:text-foreground"
            }`}
          >
            <FileText size={13} />
            <span>Files & Docs ({filteredDocs.length + filteredAttachments.length})</span>
          </button>

        </div>
      </div>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        
        {/* TAB 1: Comments Feed */}
        {activeTab === "comments" && (
          <div className="space-y-4 max-w-3xl">
            {filteredComments.length > 0 ? (
              filteredComments.map((c) => (
                <div 
                  key={c.id}
                  className="bg-surface border border-border-custom rounded-xl p-5 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-border-custom pb-2">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                      <span>{getProjectName(c.projectId)}</span>
                      <span>•</span>
                      <span>Comment on {c.parentType.toLowerCase()}</span>
                      <Link 
                        href={`/dashboard/projects/${c.projectId}?tab=${getParentTabLabel(c.parentType)}&id=${c.parentId}`}
                        className="text-indigo-650 hover:underline inline-flex items-center gap-0.5 ml-1"
                      >
                        <span>"{c.parentName}"</span>
                        <ArrowRight size={8} />
                      </Link>
                    </div>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-3 text-xs">
                    {c.user.avatarUrl ? (
                      <img
                        src={c.user.avatarUrl}
                        alt={c.user.name}
                        className="w-7 h-7 rounded-full shrink-0 border border-border-custom"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
                        <User size={13} className="text-neutral-500" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">
                          {c.user.name}
                        </span>
                        {c.isClientComment && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 rounded">
                            Client
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-355 leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-border-custom rounded-xl">
                <p className="text-xs text-neutral-400 italic">No matching comments found.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Files & Docs Feed */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Documents List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-350 border-b border-border-custom pb-2">
                Workspace Docs ({filteredDocs.length})
              </h3>
              
              <div className="space-y-2.5">
                {filteredDocs.length > 0 ? (
                  filteredDocs.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dashboard/projects/${d.projectId}?tab=docs&id=${d.id}`}
                      className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-4 flex items-center justify-between gap-4 transition-all block"
                    >
                      <div className="min-w-0 space-y-1">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                          {getProjectName(d.projectId)}
                        </span>
                        <h4 className="text-xs font-semibold text-neutral-850 dark:text-neutral-150 truncate">
                          {d.title}
                        </h4>
                      </div>
                      <span className="p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded text-neutral-400 shrink-0">
                        <FileText size={14} />
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 italic text-center py-6">
                    No documents found.
                  </p>
                )}
              </div>
            </div>

            {/* Task Attachments List */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-355 border-b border-border-custom pb-2">
                Task Attachments ({filteredAttachments.length})
              </h3>

              <div className="space-y-2.5">
                {filteredAttachments.length > 0 ? (
                  filteredAttachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-4 flex items-center justify-between gap-4 transition-all block"
                    >
                      <div className="min-w-0 space-y-1">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                          {getProjectName(a.projectId)} • Task: {a.taskName}
                        </span>
                        <h4 className="text-xs font-semibold text-neutral-850 dark:text-neutral-150 truncate">
                          {a.fileName}
                        </h4>
                      </div>
                      <span className="p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded text-neutral-400 shrink-0 flex items-center gap-1">
                        <span className="text-[8px] font-mono opacity-60">
                          {Math.round(a.fileSize / 1024)} KB
                        </span>
                        <Paperclip size={13} />
                      </span>
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 italic text-center py-6">
                    No task attachments found.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
