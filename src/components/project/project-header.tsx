"use client";

import React from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  MessageSquare, 
  MessageCircle, 
  FileText, 
  Calendar,
  Archive,
  HelpCircle
} from "lucide-react";

interface ProjectHeaderProps {
  projectName: string;
  projectDescription: string | null;
  activeTab: string;
  allowedTools: string[];
  projectId: string;
  isArchived: boolean;
}

export default function ProjectHeader({
  projectName,
  projectDescription,
  activeTab,
  allowedTools,
  projectId,
  isArchived,
}: ProjectHeaderProps) {
  // Mapping tools to their display label, icon, and tab query name
  const toolSpecs: Record<string, { label: string; icon: React.ReactNode }> = {
    tasks: {
      label: "Tasks",
      icon: <CheckCircle2 size={14} />,
    },
    discussions: {
      label: "Discussions",
      icon: <MessageSquare size={14} />,
    },
    chat: {
      label: "Chat",
      icon: <MessageCircle size={14} />,
    },
    docs: {
      label: "Docs",
      icon: <FileText size={14} />,
    },
    calendar: {
      label: "Calendar",
      icon: <Calendar size={14} />,
    },
    checkins: {
      label: "Check-ins",
      icon: <HelpCircle size={14} />,
    },
  };

  return (
    <div className="space-y-4">
      {/* Name and Meta */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
              {projectName}
            </h1>
            {isArchived && (
              <span className="flex items-center gap-1 bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 text-[10px] px-2 py-0.5 rounded border border-border-custom font-medium">
                <Archive size={10} />
                <span>Archived</span>
              </span>
            )}
          </div>
          {projectDescription && (
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              {projectDescription}
            </p>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-border-custom flex items-center gap-6 text-sm">
        {allowedTools.map((tool) => {
          const spec = toolSpecs[tool];
          if (!spec) return null;

          const isActive = activeTab === tool;

          return (
            <Link
              key={tool}
              href={`/dashboard/projects/${projectId}?tab=${tool}`}
              className={`flex items-center gap-2 py-2 border-b-2 font-semibold text-xs tracking-wide uppercase transition-all ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-neutral-500 hover:text-foreground"
              }`}
            >
              {spec.icon}
              <span>{spec.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
