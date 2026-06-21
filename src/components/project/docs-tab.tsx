"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createDocAction, updateDocAction, restoreDocVersionAction, addDocCommentAction } from "@/app/actions/docs";
import { getProjectFilesAction, deleteProjectFileAction } from "@/app/actions/project";
import { FileText, Plus, ArrowLeft, History, Send, RefreshCw, FileCode, Eye, EyeOff, Paperclip, Upload, Trash2, Download, X } from "lucide-react";
import { toggleClientVisibility } from "@/app/actions/clientmode";

interface DocCompact {
  id: string;
  title: string;
  updatedAt: string;
  visibleToClients: boolean;
}

interface DocDetails extends DocCompact {
  content: string;
  versions: { id: string; version: number; createdAt: string; title: string; content: string }[];
  comments: any[];
}

interface ProjectFileItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: { name: string };
}

interface DocsTabProps {
  projectId: string;
  selectedId?: string;
  currentUser: any;
  isClient: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocsTab({
  projectId,
  selectedId,
  isClient,
}: DocsTabProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DocCompact[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Text doc form states
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Project files state
  const [projectFiles, setProjectFiles] = useState<ProjectFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, filesRes] = await Promise.all([
        fetch(`/api/project/${projectId}/docs${selectedId ? `?id=${selectedId}` : ""}`),
        getProjectFilesAction(projectId),
      ]);
      const docsData = await docsRes.json();
      if (selectedId) {
        setActiveDoc(docsData.doc);
        setEditTitle(docsData.doc.title);
        setEditContent(docsData.doc.content);
        setShowHistory(false);
      } else {
        setDocs(docsData.docs || []);
        setActiveDoc(null);
      }
      if (filesRes.success) {
        setProjectFiles(filesRes.files as ProjectFileItem[]);
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

  const handleCreateDoc = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);

    const res = await createDocAction(projectId, newTitle, newContent);
    if (res.success && res.doc) {
      setNewTitle("");
      setNewContent("");
      setIsCreating(false);
      router.push(`/dashboard/projects/${projectId}?tab=docs&id=${res.doc.id}`);
    } else {
      alert(res.error || "Failed to create document");
    }
    setIsCreating(false);
  };

  const handleUpdateDoc = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedId || !editTitle.trim()) return;
    setIsUpdating(true);

    const res = await updateDocAction(projectId, selectedId, editTitle, editContent);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Failed to save document");
    }
    setIsUpdating(false);
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedId) return;
    if (!window.confirm("Restore document to this version?")) return;

    const res = await restoreDocVersionAction(projectId, selectedId, versionId);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Failed to restore version");
    }
  };

  const handleAddComment = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedId) return;
    setIsCommenting(true);

    const res = await addDocCommentAction(projectId, selectedId, commentText);
    if (res.success) {
      setCommentText("");
      loadData();
    } else {
      alert(res.error || "Failed to post comment");
    }
    setIsCommenting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/upload/project-file", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
      } else {
        setProjectFiles((prev) => [data.file, ...prev]);
      }
    } catch {
      setUploadError("Upload failed — please try again");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    const res = await deleteProjectFileAction(projectId, fileId);
    if (res.success) {
      setProjectFiles((prev) => prev.filter((f) => f.id !== fileId));
    } else {
      alert(res.error || "Failed to delete file");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-neutral-400">Loading documents...</span>
      </div>
    );
  }

  // Active Doc Detail & Edit View
  if (selectedId && activeDoc) {
    return (
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Editor (Left Pane) */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0 pb-12 overflow-y-auto pr-1">
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}?tab=docs`)}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors self-start shrink-0"
          >
            <ArrowLeft size={13} />
            <span>Back to documents</span>
          </button>

          <form onSubmit={handleUpdateDoc} className="bg-surface border border-border-custom rounded-xl p-6 space-y-4">
            <div>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-base font-semibold border-b border-border-custom pb-2 focus:outline-none focus:border-brand-accent bg-transparent placeholder-neutral-400"
              />
            </div>
            <div>
              <textarea
                rows={15}
                placeholder="Write doc content (supports markdown styling)..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full text-xs px-3.5 py-3 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 leading-relaxed font-mono"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isUpdating || !editTitle.trim()}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
                {!isClient && (
                  <button
                    type="button"
                    onClick={async () => {
                      const nextVal = !activeDoc.visibleToClients;
                      const res = await toggleClientVisibility("DOC", activeDoc.id, nextVal);
                      if (res.success) {
                        setActiveDoc({ ...activeDoc, visibleToClients: nextVal });
                      } else {
                        alert(res.error || "Failed to toggle visibility");
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    {activeDoc.visibleToClients ? (
                      <Eye size={10} className="shrink-0" />
                    ) : (
                      <EyeOff size={10} className="shrink-0" />
                    )}
                    <span>
                      {activeDoc.visibleToClients ? "Visible to Client" : "Private to Team"}
                    </span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-2 border border-border-custom text-neutral-600 rounded-lg text-xs hover:bg-neutral-50"
              >
                <History size={13} />
                <span>{showHistory ? "Hide Version History" : "Version History"}</span>
              </button>
            </div>
          </form>

          {/* Doc Comment Section */}
          <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Discussion on this Doc
            </h3>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              />
              <button
                type="submit"
                disabled={isCommenting || !commentText.trim()}
                className="p-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
              >
                <Send size={13} />
              </button>
            </form>
            <div className="space-y-3 mt-3">
              {activeDoc.comments.length === 0 ? (
                <p className="text-[11px] text-neutral-400 italic">No comments yet</p>
              ) : (
                activeDoc.comments.map((c: any) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border text-xs ${
                      c.isClientComment
                        ? "bg-neutral-50 dark:bg-neutral-900/30 border-l-4 border-l-neutral-400 border-neutral-200 dark:border-neutral-700"
                        : "bg-neutral-50/50 border-border-custom"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-neutral-800">{c.user.name}</span>
                        {c.isClientComment && (
                          <span className="bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[8px] font-bold px-1 rounded">
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* Version History Drawer (Right Pane) */}
        {showHistory && (
          <div className="w-80 border-l border-border-custom bg-surface p-6 flex flex-col shrink-0 overflow-y-auto h-full animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4 shrink-0">
              <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                Revision History
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-[10px] text-neutral-400 hover:text-neutral-600"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {activeDoc.versions.map((v) => (
                <div
                  key={v.id}
                  className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded-lg space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center font-mono text-[10px]">
                    <span className="bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.2 rounded font-semibold">
                      Version {v.version}
                    </span>
                    <span className="text-neutral-400">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {v.title}
                  </p>
                  <button
                    onClick={() => handleRestoreVersion(v.id)}
                    className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-semibold flex items-center gap-1 mt-1 underline"
                  >
                    <RefreshCw size={10} />
                    <span>Restore this version</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create Document Form View
  if (isCreating) {
    return (
      <div className="flex-1 flex flex-col space-y-4 max-w-2xl mx-auto pb-12">
        <button
          onClick={() => setIsCreating(false)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors self-start"
        >
          <ArrowLeft size={13} />
          <span>Cancel</span>
        </button>

        <form onSubmit={handleCreateDoc} className="bg-surface border border-border-custom rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Create a new document
          </h2>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Document Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Technical Specs"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Initial Content
            </label>
            <textarea
              rows={10}
              placeholder="Document body..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 leading-relaxed font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !newTitle.trim()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50"
          >
            Create Doc
          </button>
        </form>
      </div>
    );
  }

  // Documents List View
  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-4xl mx-auto min-h-0 pb-12">
      {/* Project Files Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip size={12} />
            <span>Project Files ({projectFiles.length})</span>
          </h3>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="*/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-custom text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Upload size={12} />
              <span>{isUploading ? "Uploading..." : "Upload File"}</span>
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-600">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)}>
              <X size={12} />
            </button>
          </div>
        )}

        {projectFiles.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-border-custom rounded-xl py-6 flex flex-col items-center gap-2 cursor-pointer hover:border-neutral-400 transition-colors"
          >
            <Upload size={18} className="text-neutral-300" />
            <p className="text-xs text-neutral-400">Click to upload a file (up to 100 MB)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {projectFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 bg-surface border border-border-custom rounded-xl hover:border-neutral-400 transition-colors group"
              >
                <div className="p-2 bg-neutral-50 dark:bg-neutral-900 border border-border-custom rounded-lg shrink-0">
                  <Paperclip size={14} className="text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {f.fileName}
                  </p>
                  <p className="text-[9px] text-neutral-400 mt-0.5">
                    {formatBytes(f.fileSize)} · {f.uploadedBy.name} · {new Date(f.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={f.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={f.fileName}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Download"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={13} />
                  </a>
                  {!isClient && (
                    <button
                      onClick={() => handleDeleteFile(f.id, f.fileName)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text Documents Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Workspace Documents ({docs.length})
          </h3>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium"
          >
            <Plus size={13} />
            <span>New Document</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {docs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-custom rounded-xl">
              <FileCode size={24} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-400">No documents created yet.</p>
            </div>
          ) : (
            docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => router.push(`/dashboard/projects/${projectId}?tab=docs&id=${doc.id}`)}
                className={`p-4 bg-surface border hover:border-neutral-400 rounded-xl cursor-pointer flex items-center justify-between transition-all ${
                  !isClient && !doc.visibleToClients
                    ? "border-dashed border-neutral-300 dark:border-neutral-700"
                    : "border-border-custom"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText size={16} className="text-neutral-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {doc.title}
                      </h4>
                      {!isClient && !doc.visibleToClients && (
                        <span className="flex items-center gap-0.5 text-[8px] font-bold bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1 py-0.5 rounded">
                          <EyeOff size={8} className="shrink-0" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-neutral-400 mt-1">
                      Last updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
