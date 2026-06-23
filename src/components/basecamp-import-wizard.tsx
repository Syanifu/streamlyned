"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle, Users, ArrowRight, Loader2, AlertCircle, FileArchive } from "lucide-react";
import type { BasecampPreview, BCPerson } from "@/lib/basecamp-parser";
import type { ImportResults } from "@/app/api/import/basecamp/confirm/route";

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
}

type Step = "upload" | "preview" | "mapping" | "importing" | "done";

export default function BasecampImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<BasecampPreview | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [peopleMapping, setPeopleMapping] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ImportResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: handle zip upload ──────────────────────────────────────
  async function handleFilePicked(picked: File) {
    if (!picked.name.endsWith(".zip")) {
      setError("Please upload a .zip file exported from Basecamp.");
      return;
    }
    setFile(picked);
    setError(null);
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", picked);
      const res = await fetch("/api/import/basecamp/parse", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Auto-match people by email
      const autoMap: Record<string, string> = {};
      for (const person of data.preview.allPeople as BCPerson[]) {
        const match = (data.workspaceMembers as WorkspaceMember[]).find(
          (m) => m.email.toLowerCase() === person.email_address?.toLowerCase()
        );
        autoMap[person.email_address] = match?.id ?? "";
      }

      setPreview(data.preview);
      setWorkspaceMembers(data.workspaceMembers);
      setPeopleMapping(autoMap);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Failed to read file.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 3 → 4: run the import ─────────────────────────────────────
  async function runImport() {
    if (!preview) return;
    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/import/basecamp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview, peopleMapping }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "Import failed.");
      setStep("mapping");
    }
  }

  const stepOrder: Step[] = ["upload", "preview", "mapping", "importing", "done"];
  const stepIdx = stepOrder.indexOf(step);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      {step !== "done" && (
        <div className="flex items-center gap-2 mb-8">
          {["Upload", "Preview", "People", "Import"].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                i < stepIdx
                  ? "text-emerald-600 dark:text-emerald-400"
                  : i === stepIdx
                  ? "text-neutral-900 dark:text-white"
                  : "text-neutral-400 dark:text-neutral-600"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                  i < stepIdx
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : i === stepIdx
                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900"
                    : "border-neutral-300 dark:border-neutral-700 text-neutral-400"
                }`}>
                  {i < stepIdx ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 3 && (
                <div className={`flex-1 h-px transition-colors ${
                  i < stepIdx ? "bg-emerald-400" : "bg-neutral-200 dark:bg-neutral-800"
                }`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-4 py-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── Step 1: Upload ──────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="rounded-2xl border border-border-custom bg-surface p-8">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            Upload Basecamp export
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            In Basecamp: go to <span className="font-medium">Account → Export Data → Request export</span>.
            Once you receive the download link, upload the .zip file here.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) handleFilePicked(dropped);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-12 ${
              isDragging
                ? "border-neutral-600 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-900"
                : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={32} className="text-neutral-400 animate-spin" />
                <p className="text-sm font-medium text-neutral-500">Parsing export file…</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <FileArchive size={22} className="text-neutral-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    {file ? file.name : "Drop your .zip file here"}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">or click to browse — max 200 MB</p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePicked(f);
            }}
          />
        </div>
      )}

      {/* ── Step 2: Preview ──────────────────────────────────────────── */}
      {step === "preview" && preview && (
        <div className="rounded-2xl border border-border-custom bg-surface p-8">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
            Found in your export
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Review what will be imported, then continue to match your team members.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: "Modules", value: preview.stats.projectCount },
              { label: "Task Lists", value: preview.stats.taskListCount },
              { label: "Tasks", value: preview.stats.taskCount },
              { label: "Discussions", value: preview.stats.messageCount },
              { label: "Docs", value: preview.stats.docCount },
              { label: "People", value: preview.stats.peopleCount },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-border-custom px-4 py-3"
              >
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Project list */}
          <div className="space-y-2 mb-6">
            {preview.projects.map((p) => (
              <div
                key={String(p.id)}
                className="flex items-center justify-between rounded-lg border border-border-custom px-4 py-2.5"
              >
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {p.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {p.todoLists.reduce(
                    (s, tl) => s + tl.todos.remaining.length + tl.todos.completed.length,
                    0
                  )}{" "}
                  tasks · {p.messages.length} discussions · {p.docs.length} docs
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("mapping")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Continue
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* ── Step 3: People mapping ───────────────────────────────────── */}
      {step === "mapping" && preview && (
        <div className="rounded-2xl border border-border-custom bg-surface p-8">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-neutral-600 dark:text-neutral-400" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              Match your team
            </h2>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Map Basecamp members to workspace members so tasks are assigned correctly.
            People with matching emails were auto-matched.
          </p>

          {preview.allPeople.length === 0 ? (
            <p className="text-sm text-neutral-400 italic mb-6">
              No people found in the export — tasks will be unassigned.
            </p>
          ) : (
            <div className="space-y-3 mb-6">
              {preview.allPeople.map((person) => {
                const isAutoMatched =
                  workspaceMembers.find(
                    (m) =>
                      m.email.toLowerCase() ===
                      person.email_address?.toLowerCase()
                  ) !== undefined;

                return (
                  <div
                    key={person.email_address}
                    className="flex items-center gap-3 rounded-xl border border-border-custom px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {person.name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">
                        {person.email_address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAutoMatched && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Auto-matched
                        </span>
                      )}
                      <select
                        value={peopleMapping[person.email_address] ?? ""}
                        onChange={(e) =>
                          setPeopleMapping((prev) => ({
                            ...prev,
                            [person.email_address]: e.target.value,
                          }))
                        }
                        className="text-xs rounded-lg border border-border-custom bg-surface px-2.5 py-1.5 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                      >
                        <option value="">Skip / unassigned</option>
                        {workspaceMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("preview")}
              className="px-5 py-2.5 rounded-full border border-border-custom text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={runImport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Start import
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Importing ────────────────────────────────────────── */}
      {step === "importing" && (
        <div className="rounded-2xl border border-border-custom bg-surface p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Loader2 size={26} className="text-neutral-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              Importing your data…
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              This may take a moment. Please keep this tab open.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 5: Done ────────────────────────────────────────────── */}
      {step === "done" && results && (
        <div className="rounded-2xl border border-border-custom bg-surface p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Import complete!
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Your Basecamp data is now in Streamlyned.
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            {[
              { label: "Modules created", value: results.projectsCreated },
              { label: "Task lists created", value: results.taskListsCreated },
              { label: "Tasks imported", value: results.tasksCreated },
              { label: "Discussions imported", value: results.discussionsCreated },
              { label: "Docs imported", value: results.docsCreated },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg bg-neutral-50 dark:bg-neutral-800/50 px-4 py-2.5"
              >
                <span className="text-sm text-neutral-600 dark:text-neutral-400">{row.label}</span>
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <a
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Go to modules
            <ArrowRight size={15} />
          </a>
        </div>
      )}
    </div>
  );
}
