import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { executeHybridSearch } from "@/lib/ai/search";
import Link from "next/link";
import { 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  MessageCircle, 
  ExternalLink,
  Search,
  Sparkles
} from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const { q: query = "" } = await searchParams;

  let answer = "";
  let results: any[] = [];

  if (query.trim()) {
    const searchResult = await executeHybridSearch(
      session.workspace.id,
      session.user.id,
      session.role,
      query.trim()
    );
    answer = searchResult.answer;
    results = searchResult.results;
  }

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-custom pb-4 shrink-0">
        <Search size={20} className="text-neutral-400" />
        <div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
            Smart Search
          </h1>
          {query.trim() ? (
            <p className="text-xs text-neutral-400 mt-1">
              Search results for "{query.trim()}"
            </p>
          ) : (
            <p className="text-xs text-neutral-400 mt-1">
              Type in the global search bar to fetch and rank workspace content.
            </p>
          )}
        </div>
      </div>

      {query.trim() ? (
        <div className="space-y-8">
          {/* AI-Native Synthesized Cited Answer */}
          <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={16} />
              <h2 className="text-xs font-semibold uppercase tracking-wider">
                Synthesized Answer
              </h2>
            </div>
            
            <div className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans prose prose-neutral max-w-none">
              {answer}
            </div>

            <div className="text-[10px] text-neutral-400 border-t border-border-custom pt-3 mt-3">
              *Synthesized dynamically from workspace context permissions. Excluded private DMs and unauthorized projects.
            </div>
          </div>

          {/* Ranked List of Results */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Matched Records ({results.length})
            </h3>

            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border-custom rounded-xl">
                  <Search size={24} className="text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">No matching documents or tasks found.</p>
                </div>
              ) : (
                results.map((r, index) => {
                  return (
                    <div
                      key={r.id}
                      className="p-4 bg-surface border border-border-custom hover:border-neutral-400 rounded-xl flex items-center justify-between transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {r.type === "TASK" && <CheckCircle2 size={16} className="text-neutral-400 mt-0.5 shrink-0" />}
                        {r.type === "DISCUSSION" && <MessageSquare size={16} className="text-indigo-400 mt-0.5 shrink-0" />}
                        {r.type === "DOC" && <FileText size={16} className="text-neutral-400 mt-0.5 shrink-0" />}
                        {r.type === "CHAT" && <MessageCircle size={16} className="text-neutral-400 mt-0.5 shrink-0" />}
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-neutral-100 dark:bg-neutral-800 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono text-neutral-700 dark:text-neutral-300">
                              Source {index + 1}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              Project: {r.projectName}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-1.5">
                            {r.title}
                          </h4>
                          <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed">
                            {r.excerpt}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={r.targetUrl}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline ml-4 shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border-custom rounded-xl bg-surface/50">
          <Search size={28} className="text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-600">No query provided.</p>
          <p className="text-[10px] text-neutral-400 mt-1">Submit a search from the header above to locate items.</p>
        </div>
      )}
    </div>
  );
}
