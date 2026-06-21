"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Database, Loader2, CheckCircle2, AlertCircle, Link2, X, Download } from "lucide-react";

interface NotionItem {
  id: string;
  type: "page" | "database";
  title: string;
  url: string;
}

interface NotionImportModalProps {
  isConnected: boolean;
  notionWorkspaceName?: string | null;
}

export default function NotionImportModal({ isConnected, notionWorkspaceName }: NotionImportModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pages, setPages] = useState<NotionItem[]>([]);
  const [databases, setDatabases] = useState<NotionItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<{ title: string; status: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notionStatus = searchParams.get("notion");

  useEffect(() => {
    if (notionStatus === "connected") {
      router.replace("/dashboard/settings");
    }
  }, [notionStatus, router]);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion/pages");
      if (!res.ok) throw new Error("Failed to fetch Notion content");
      const data = await res.json();
      setPages(data.pages);
      setDatabases(data.databases);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setResults(null);
    setSelected(new Set());
    fetchPages();
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!selected.size) return;
    setImporting(true);
    setError(null);

    const allItems = [...pages, ...databases];
    const items = allItems.filter((i) => selected.has(i.id)).map(({ id, type, title }) => ({ id, type, title }));

    try {
      const res = await fetch("/api/notion/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResults(data.results);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const allItems = [...pages, ...databases];

  return (
    <>
      <div className="flex items-center gap-3">
        {isConnected ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
              <CheckCircle2 size={13} />
              <span>Connected to {notionWorkspaceName || "Notion"}</span>
            </div>
            <button
              onClick={handleOpen}
              className="flex items-center gap-1.5 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={12} />
              Import Content
            </button>
          </>
        ) : (
          <a
            href="/api/notion/auth"
            className="flex items-center gap-1.5 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Link2 size={12} />
            Connect Notion
          </a>
        )}
        {notionStatus === "error" && (
          <span className="text-xs text-red-500">Connection failed. Try again.</span>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-900 border border-border-custom rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-custom">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Import from Notion</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Select pages and databases to import</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loading && (
                <div className="flex items-center justify-center py-10 text-neutral-400 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Loading your Notion content…</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {results && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Import complete</p>
                  {results.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                      <CheckCircle2 size={13} className="shrink-0 mt-0.5 text-green-500" />
                      <span><span className="font-medium text-neutral-800 dark:text-neutral-200">{r.title}</span> — {r.status}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-3 w-full text-xs py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              )}

              {!loading && !results && allItems.length > 0 && (
                <>
                  {databases.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Databases → Projects
                      </p>
                      <div className="space-y-1">
                        {databases.map((db) => (
                          <label key={db.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.has(db.id)}
                              onChange={() => toggle(db.id)}
                              className="rounded"
                            />
                            <Database size={13} className="text-neutral-400 shrink-0" />
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 truncate">{db.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {pages.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        Pages → Docs
                      </p>
                      <div className="space-y-1">
                        {pages.map((page) => (
                          <label key={page.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected.has(page.id)}
                              onChange={() => toggle(page.id)}
                              className="rounded"
                            />
                            <FileText size={13} className="text-neutral-400 shrink-0" />
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 truncate">{page.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {allItems.length === 0 && (
                    <p className="text-xs text-neutral-400 text-center py-6">No pages or databases found in your Notion workspace.</p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!results && (
              <div className="px-6 py-4 border-t border-border-custom flex items-center justify-between">
                <span className="text-xs text-neutral-400">{selected.size} selected</span>
                <button
                  onClick={handleImport}
                  disabled={!selected.size || importing}
                  className="flex items-center gap-1.5 text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  {importing ? "Importing…" : "Import Selected"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
