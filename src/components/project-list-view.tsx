"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Folder, Plus, X, Loader2, ArrowRight } from "lucide-react";
import { createProjectAction } from "@/app/actions/project";
import { useRouter } from "next/navigation";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    members: number;
  };
}

interface ProjectListViewProps {
  projects: ProjectItem[];
  workspaceName: string;
  isClient: boolean;
}

export default function ProjectListView({
  projects,
  workspaceName,
  isClient,
}: ProjectListViewProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const res = await createProjectAction({ 
      name, 
      description,
      startDate: startDate || null,
      endDate: endDate || null
    });
    if (res.success && res.projectId) {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setIsOpen(false);
      router.push(`/dashboard/projects/${res.projectId}`);
      router.refresh();
    } else {
      setError(res.error || "Failed to create project.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header section with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {workspaceName} Projects
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Choose a project workspace to manage tasks, collaborate on threads, and edit documents.
          </p>
        </div>

        {!isClient && (
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 transition-colors dark:bg-neutral-800 dark:hover:bg-neutral-700 font-sans"
          >
            <Plus size={14} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-border-custom rounded-xl p-12 text-center bg-surface">
          <Folder size={32} className="mx-auto text-neutral-300 dark:text-neutral-750" />
          <h3 className="mt-4 text-xs font-semibold text-neutral-850 dark:text-neutral-150">
            No projects in this workspace
          </h3>
          <p className="mt-1 text-[11px] text-neutral-400">
            Get started by creating your first team workspace project.
          </p>
          {!isClient && (
            <button
              onClick={() => setIsOpen(true)}
              className="mt-4 inline-flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg dark:bg-neutral-800 dark:hover:bg-neutral-700"
            >
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-5 block transition-all hover:shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 line-clamp-1">
                    {project.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 h-8 leading-relaxed">
                    {project.description || "No description provided."}
                  </p>
                </div>
                <span className="p-1.5 rounded bg-neutral-50 dark:bg-neutral-900 text-neutral-450 border border-border-custom">
                  <Folder size={15} />
                </span>
              </div>

              <div className="mt-6 pt-4 border-t border-border-custom flex items-center justify-between text-[10px] text-neutral-400 font-medium">
                <span>{project._count.members} Members</span>
                <span className="flex items-center gap-0.5 text-brand-accent">
                  <span>Enter</span>
                  <ArrowRight size={10} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/10 dark:bg-black/35 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Dialog Card */}
          <div className="relative bg-surface border border-border-custom w-full max-w-md rounded-xl p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-border-custom">
              <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                Create New Project
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Overhaul"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  placeholder="e.g. Complete redesign of client portal wireframes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent text-neutral-850 dark:text-neutral-150 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-750"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-750"
                  />
                </div>
              </div>

              {error && (
                <div className="text-[10px] text-brand-danger bg-red-50 border border-red-100 dark:bg-red-950/10 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-2 border border-border-custom text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold px-4 py-2 disabled:opacity-50 transition-colors dark:bg-neutral-850 dark:hover:bg-neutral-750"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
