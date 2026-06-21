"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  Filter,
  Search,
  Paperclip,
  User,
  ArrowRight,
  Brain,
  Upload,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
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

interface ProjectFileFeedItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  projectId: string;
  uploadedBy: { name: string };
}

interface KnowledgeFileItem {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { name: string };
}

interface EverythingDashboardViewProps {
  projects: ProjectItem[];
  comments: CommentFeedItem[];
  docs: DocFeedItem[];
  attachments: AttachmentFeedItem[];
  projectFiles: ProjectFileFeedItem[];
  knowledgeFiles: KnowledgeFileItem[];
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EverythingDashboardView({
  projects,
  comments,
  docs,
  attachments,
  projectFiles,
  knowledgeFiles: initialKnowledgeFiles,
}: EverythingDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"comments" | "files">("comments");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Knowledge upload state
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFileItem[]>(initialKnowledgeFiles);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const getProjectName = (pId: string) =>
    projects.find((p) => p.id === pId)?.name || "Unknown Project";

  const getParentTabLabel = (type: "TASK" | "DISCUSSION" | "DOC") =>
    type === "TASK" ? "tasks" : "docs";

  const filterByProject = <T extends { projectId: string }>(items: T[]): T[] =>
    selectedProjectId === "all" ? items : items.filter((i) => i.projectId === selectedProjectId);

  const filterBySearch = <T extends Record<string, any>>(items: T[], fields: (keyof T)[]): T[] => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) =>
      fields.some((f) => {
        const v = item[f];
        if (typeof v === "string") return v.toLowerCase().includes(q);
        if (v && typeof v === "object" && "name" in v)
          return (v.name as string).toLowerCase().includes(q);
        return false;
      })
    );
  };

  const filteredComments = filterBySearch(filterByProject(comments), ["content", "parentName", "user"]);
  const filteredDocs = filterBySearch(filterByProject(docs), ["title"]);
  const filteredAttachments = filterBySearch(filterByProject(attachments), ["fileName", "taskName"]);
  const filteredProjectFiles = filterBySearch(filterByProject(projectFiles), ["fileName"]);
  const filteredKnowledge = filterBySearch(knowledgeFiles, ["name", "description"]);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      form.append("description", uploadDescription);
      const res = await fetch("/api/upload/workspace-knowledge", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setKnowledgeFiles((prev) => [data.file, ...prev]);
      setUploadStatus("success");
      setSelectedFile(null);
      setUploadDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => {
        setUploadStatus("idle");
        setShowUploadForm(false);
      }, 1800);
    } catch (e: any) {
      setUploadError(e.message);
      setUploadStatus("error");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this file from Ashy's knowledge base?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/upload/workspace-knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setKnowledgeFiles((prev) => prev.filter((k) => k.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const totalFiles = filteredDocs.length + filteredAttachments.length + filteredProjectFiles.length + filteredKnowledge.length;

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 bg-surface border border-border-custom px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter size={14} className="text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider hidden md:inline">
            Project:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs bg-surface border border-border-custom rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-200 w-full sm:w-auto"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

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

      {/* Tabs */}
      <div className="flex justify-between items-center shrink-0 border-b border-border-custom pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("comments")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "comments"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-600 hover:text-foreground"
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
                : "border-transparent text-neutral-600 hover:text-foreground"
            }`}
          >
            <FileText size={13} />
            <span>Files & Docs ({totalFiles})</span>
          </button>
        </div>
      </div>

      {/* Feed Area */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* TAB 1: Comments */}
        {activeTab === "comments" && (
          <div className="space-y-4 max-w-3xl">
            {filteredComments.length > 0 ? (
              filteredComments.map((c) => (
                <div key={c.id} className="bg-surface border border-border-custom rounded-xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-border-custom pb-2">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                      <span>{getProjectName(c.projectId)}</span>
                      <span>•</span>
                      <span>Comment on {c.parentType.toLowerCase()}</span>
                      <Link
                        href={`/dashboard/projects/${c.projectId}?tab=${getParentTabLabel(c.parentType)}&id=${c.parentId}`}
                        className="text-neutral-700 dark:text-neutral-300 hover:underline inline-flex items-center gap-0.5 ml-1"
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
                      <img src={c.user.avatarUrl} alt={c.user.name} className="w-7 h-7 rounded-full shrink-0 border border-border-custom" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 border border-border-custom">
                        <User size={13} className="text-neutral-600" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200">{c.user.name}</span>
                        {c.isClientComment && (
                          <span className="bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[8px] font-bold px-1.5 rounded">Client</span>
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

        {/* TAB 2: Files & Docs */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-5xl items-start">

            {/* Workspace Docs */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-350 border-b border-border-custom pb-2">
                Workspace Docs ({filteredDocs.length})
              </h3>
              <div className="space-y-2.5">
                {filteredDocs.length > 0 ? filteredDocs.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/projects/${d.projectId}?tab=docs&id=${d.id}`}
                    className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-4 flex items-center justify-between gap-4 transition-all block"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                        {getProjectName(d.projectId)}
                      </span>
                      <h4 className="text-xs font-semibold text-neutral-850 dark:text-neutral-150 truncate">{d.title}</h4>
                    </div>
                    <span className="p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded text-neutral-400 shrink-0">
                      <FileText size={14} />
                    </span>
                  </Link>
                )) : (
                  <p className="text-xs text-neutral-400 italic text-center py-6">No documents found.</p>
                )}
              </div>
            </div>

            {/* Task Attachments */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-355 border-b border-border-custom pb-2">
                Task Attachments ({filteredAttachments.length})
              </h3>
              <div className="space-y-2.5">
                {filteredAttachments.length > 0 ? filteredAttachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-4 flex items-center justify-between gap-4 transition-all block"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                        {getProjectName(a.projectId)} • {a.taskName}
                      </span>
                      <h4 className="text-xs font-semibold text-neutral-850 dark:text-neutral-150 truncate">{a.fileName}</h4>
                    </div>
                    <span className="p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded text-neutral-400 shrink-0 flex items-center gap-1">
                      <span className="text-[8px] font-mono opacity-60">{fmtSize(a.fileSize)}</span>
                      <Paperclip size={13} />
                    </span>
                  </a>
                )) : (
                  <p className="text-xs text-neutral-400 italic text-center py-6">No task attachments found.</p>
                )}
              </div>
            </div>

            {/* Project Files */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-355 border-b border-border-custom pb-2">
                Project Files ({filteredProjectFiles.length})
              </h3>
              <div className="space-y-2.5">
                {filteredProjectFiles.length > 0 ? filteredProjectFiles.map((f) => (
                  <a
                    key={f.id}
                    href={f.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-4 flex items-center justify-between gap-4 transition-all block"
                  >
                    <div className="min-w-0 space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">
                        {getProjectName(f.projectId)} • {f.uploadedBy.name}
                      </span>
                      <h4 className="text-xs font-semibold text-neutral-850 dark:text-neutral-150 truncate">{f.fileName}</h4>
                    </div>
                    <span className="p-1.5 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded text-neutral-400 shrink-0 flex items-center gap-1">
                      <span className="text-[8px] font-mono opacity-60">{fmtSize(f.fileSize)}</span>
                      <Paperclip size={13} />
                    </span>
                  </a>
                )) : (
                  <p className="text-xs text-neutral-400 italic text-center py-6">No project files found.</p>
                )}
              </div>
            </div>

            {/* AI Knowledge Base */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border-custom pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Brain size={12} />
                  Ashy Knowledge ({filteredKnowledge.length})
                </h3>
                <button
                  onClick={() => { setShowUploadForm((v) => !v); setUploadStatus("idle"); setUploadError(""); }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  {showUploadForm ? <X size={11} /> : <Upload size={11} />}
                  {showUploadForm ? "Cancel" : "Upload"}
                </button>
              </div>

              {/* Upload form */}
              {showUploadForm && (
                <div className="bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded-xl p-4 space-y-3">
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Upload any file. Text-based files (.txt, .md, .csv, .json) are automatically read and indexed. For PDFs or images, add a description so Ashy can reference it.
                  </p>

                  {/* File picker */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:border-neutral-500 transition-colors"
                  >
                    <Upload size={16} className="text-neutral-400" />
                    <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-medium text-center">
                      {selectedFile ? selectedFile.name : "Click to choose file"}
                    </span>
                    {selectedFile && (
                      <span className="text-[9px] text-neutral-400 font-mono">{fmtSize(selectedFile.size)}</span>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setSelectedFile(f); setUploadStatus("idle"); setUploadError(""); }
                      }}
                    />
                  </div>

                  {/* Description */}
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Describe this file for Ashy (e.g. 'Brand guidelines for Streamlyned, includes tone of voice and colour palette')…"
                    rows={3}
                    className="w-full text-[11px] bg-white dark:bg-neutral-900 border border-border-custom rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-neutral-400 placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
                  />

                  {/* Status */}
                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-600">
                      <AlertCircle size={11} />
                      {uploadError}
                    </div>
                  )}
                  {uploadStatus === "success" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-800 dark:text-neutral-200">
                      <CheckCircle2 size={11} />
                      Indexed and ready for Ashy.
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadStatus === "uploading"}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {uploadStatus === "uploading" ? (
                      <><Loader2 size={12} className="animate-spin" /> Uploading & Indexing…</>
                    ) : (
                      <><Brain size={12} /> Add to Ashy Knowledge</>
                    )}
                  </button>
                </div>
              )}

              {/* Knowledge file list */}
              <div className="space-y-2.5">
                {filteredKnowledge.length > 0 ? filteredKnowledge.map((k) => (
                  <div
                    key={k.id}
                    className="bg-surface border border-border-custom hover:border-neutral-400 rounded-xl p-3 space-y-1.5 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <a
                          href={k.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-600 dark:hover:text-neutral-300 truncate block"
                        >
                          {k.name}
                        </a>
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {k.uploadedBy.name} • {fmtSize(k.fileSize)} • {new Date(k.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(k.id)}
                        disabled={deletingId === k.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all shrink-0"
                        title="Remove from knowledge base"
                      >
                        {deletingId === k.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      </button>
                    </div>
                    {k.description && (
                      <p className="text-[10px] text-neutral-600 leading-relaxed line-clamp-2">{k.description}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <Brain size={9} className="text-neutral-400" />
                      <span className="text-[9px] text-neutral-600 font-medium">Ashy indexed</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 border border-dashed border-border-custom rounded-xl">
                    <Brain size={20} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      No knowledge files yet.<br />Upload brand guidelines, SOPs, or any reference Ashy should know about.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
