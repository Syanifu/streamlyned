"use client";

import React, { useState } from "react";
import { PRIORITY_MAP } from "./project/tasks-tab";
import { 
  BarChart2, 
  User, 
  Calendar, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FolderOpen,
  Filter,
  CheckSquare
} from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isArchived: boolean;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDateEnd: string | null;
  createdAt: string;
  completedAt: string | null;
  projectId: string;
  assigneeIds: string[];
  priority: string;
}

interface ReportsDashboardViewProps {
  projects: ProjectItem[];
  users: UserItem[];
  tasks: TaskItem[];
}

export default function ReportsDashboardView({
  projects,
  users,
  tasks,
}: ReportsDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<"lineup" | "assignments" | "mission" | "overdue">("lineup");
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || "");

  // Helpers
  const getProjectName = (pId: string) => {
    return projects.find((p) => p.id === pId)?.name || "Unknown Project";
  };

  const getDaysOverdue = (dueDateStr: string) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // 1. Compute Overdue Tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.isCompleted || !t.dueDateEnd) return false;
    const due = new Date(t.dueDateEnd);
    const today = new Date();
    // Set hours to 0 to compare days
    due.setHours(23, 59, 59, 999);
    return due.getTime() < today.getTime();
  });

  // 2. Compute Assignments details
  const userTasks = tasks.filter((t) => t.assigneeIds.includes(selectedUserId));
  const userCompletedTasks = userTasks.filter((t) => t.isCompleted);
  const userPendingTasks = userTasks.filter((t) => !t.isCompleted);

  // 3. Compute Mission Control health for each project
  const projectHealthMetrics = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const total = pTasks.length;
    const completed = pTasks.filter((t) => t.isCompleted).length;
    const pOverdue = pTasks.filter((t) => {
      if (t.isCompleted || !t.dueDateEnd) return false;
      const due = new Date(t.dueDateEnd);
      due.setHours(23, 59, 59, 999);
      return due.getTime() < new Date().getTime();
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let health: "HEALTHY" | "RISKY" | "CRITICAL" = "HEALTHY";
    if (pOverdue >= 3) {
      health = "CRITICAL";
    } else if (pOverdue > 0) {
      health = "RISKY";
    }

    return {
      project: p,
      total,
      completed,
      overdue: pOverdue,
      completionRate,
      health,
    };
  });

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Capsule switcher */}
      <div className="flex justify-between items-center shrink-0 border-b border-border-custom pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("lineup")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "lineup"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-600 hover:text-foreground"
            }`}
          >
            <Calendar size={13} />
            <span>The Lineup</span>
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "assignments"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-600 hover:text-foreground"
            }`}
          >
            <User size={13} />
            <span>Someone's Assignments</span>
          </button>
          <button
            onClick={() => setActiveTab("mission")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "mission"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-600 hover:text-foreground"
            }`}
          >
            <Activity size={13} />
            <span>Mission Control</span>
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "overdue"
                ? "border-foreground text-foreground text-red-650 dark:text-red-450 border-red-500"
                : "border-transparent text-neutral-600 hover:text-foreground"
            }`}
          >
            <Clock size={13} />
            <span>Overdue Tasks ({overdueTasks.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        
        {/* Tab 1: The Lineup (Timeline representation) */}
        {activeTab === "lineup" && (
          <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-100">
                Project Timelines
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                Visual lineup of workspace projects sorted by schedule.
              </p>
            </div>

            <div className="space-y-4">
              {projects.length > 0 ? (
                projects.map((p) => {
                  const hasDates = p.startDate && p.endDate;
                  
                  return (
                    <div 
                      key={p.id}
                      className="border border-border-custom rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {p.name}
                        </span>
                        <p className="text-[10px] text-neutral-400 max-w-md line-clamp-1">
                          {p.description || "No project description provided."}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {hasDates ? (
                          <div className="flex items-center gap-3">
                            <div className="text-[10px] font-mono text-neutral-450 bg-surface border border-border-custom px-2 py-1 rounded">
                              <span className="opacity-60 uppercase mr-1">Start:</span>
                              {new Date(p.startDate!).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-[10px] font-mono text-neutral-450 bg-surface border border-border-custom px-2 py-1 rounded">
                              <span className="opacity-60 uppercase mr-1">End:</span>
                              {new Date(p.endDate!).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </div>

                            {/* Mini Gantt bar simulation */}
                            <div className="w-24 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full relative overflow-hidden hidden sm:block">
                              <div className="absolute left-1/4 right-1/4 h-full bg-neutral-500 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-400 italic">
                            Timeline dates not configured
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <FolderOpen size={24} className="text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 italic">No projects exist in this workspace.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Someone's Assignments */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            {/* User Filter Dropdown */}
            <div className="bg-surface border border-border-custom p-4 rounded-xl flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-neutral-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Select Team Member
                </span>
              </div>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="text-xs bg-surface border border-border-custom rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-200"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* In Progress Column */}
              <div className="bg-surface border border-border-custom rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 border-b border-border-custom pb-2">
                  <Clock size={13} className="text-neutral-600" />
                  <span>In Progress ({userPendingTasks.length})</span>
                </h3>

                <div className="space-y-3.5">
                  {userPendingTasks.length > 0 ? (
                    userPendingTasks.map((t) => (
                      <div 
                        key={t.id}
                        className={`bg-background border border-border-custom rounded-lg p-3 space-y-1.5 border-l-4 ${
                          PRIORITY_MAP[t.priority]?.border || "border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-neutral-450 uppercase bg-neutral-100 dark:bg-neutral-800 border border-border-custom px-1.5 py-0.5 rounded w-fit block">
                            {getProjectName(t.projectId)}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded ${PRIORITY_MAP[t.priority]?.bg || ""} ${PRIORITY_MAP[t.priority]?.text || ""} border ${PRIORITY_MAP[t.priority]?.border || ""}`}>
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100">
                          {t.title}
                        </h4>
                        {t.dueDateEnd && (
                          <p className="text-[9px] text-neutral-400 font-mono flex items-center gap-1">
                            <Calendar size={10} />
                            <span>Due: {new Date(t.dueDateEnd).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 italic text-center py-6">
                      No active tasks assigned.
                    </p>
                  )}
                </div>
              </div>

              {/* Completed Column */}
              <div className="bg-surface border border-border-custom rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 border-b border-border-custom pb-2">
                  <CheckCircle size={13} className="text-neutral-600" />
                  <span>Completed ({userCompletedTasks.length})</span>
                </h3>

                <div className="space-y-3.5">
                  {userCompletedTasks.length > 0 ? (
                    userCompletedTasks.map((t) => (
                      <div 
                        key={t.id}
                        className={`bg-background border border-border-custom rounded-lg p-3 space-y-1.5 opacity-70 border-l-4 ${
                          PRIORITY_MAP[t.priority]?.border || "border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-neutral-450 uppercase bg-neutral-100 dark:bg-neutral-800 border border-border-custom px-1.5 py-0.5 rounded w-fit block">
                            {getProjectName(t.projectId)}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded ${PRIORITY_MAP[t.priority]?.bg || ""} ${PRIORITY_MAP[t.priority]?.text || ""} border ${PRIORITY_MAP[t.priority]?.border || ""}`}>
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 line-through">
                          {t.title}
                        </h4>
                        {t.completedAt && (
                          <p className="text-[9px] text-neutral-400 font-mono flex items-center gap-1">
                            <CheckSquare size={10} />
                            <span>Completed: {new Date(t.completedAt).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 italic text-center py-6">
                      No completed tasks yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Mission Control (Health status grid per project) */}
        {activeTab === "mission" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectHealthMetrics.map(({ project: p, total, completed, overdue: pOverdue, completionRate, health }) => (
              <div 
                key={p.id}
                className="bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-5 space-y-4 shadow-xs transition-all"
              >
                {/* Project details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xs font-bold text-neutral-850 dark:text-neutral-150 truncate">
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-neutral-400 line-clamp-1">
                      {p.description || "No description."}
                    </p>
                  </div>
                  
                  {/* Health label */}
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                    health === "HEALTHY"
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700"
                      : health === "RISKY"
                      ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600"
                      : "bg-red-50 dark:bg-red-950/20 text-red-750 border-red-100 dark:border-red-900/30"
                  }`}>
                    {health}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono text-neutral-450">
                    <span>Task Progress</span>
                    <span>{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        health === "HEALTHY" ? "bg-neutral-700 dark:bg-neutral-400" : health === "RISKY" ? "bg-neutral-500" : "bg-neutral-900 dark:bg-white"
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border-custom">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wide block">
                      Total Tasks
                    </span>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      {total}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wide block">
                      Completed
                    </span>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                      {completed}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-wide block">
                      Overdue
                    </span>
                    <span className={`text-xs font-bold block ${pOverdue > 0 ? "text-red-500" : "text-neutral-700 dark:text-neutral-200"}`}>
                      {pOverdue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Overdue Tasks */}
        {activeTab === "overdue" && (
          <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-650 dark:text-red-450 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                <span>Overdue Tasks ({overdueTasks.length})</span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                Immediate attention required: active tasks that have passed their set deadlines.
              </p>
            </div>

            <div className="space-y-3">
              {overdueTasks.length > 0 ? (
                overdueTasks.map((t) => {
                  const days = getDaysOverdue(t.dueDateEnd!);
                  return (
                    <div 
                      key={t.id}
                      className={`border border-red-100 dark:border-red-950/20 bg-red-50/10 dark:bg-red-950/5 p-4 rounded-xl flex items-center justify-between gap-4 border-l-4 ${
                        PRIORITY_MAP[t.priority]?.border || "border-transparent"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-neutral-450 uppercase bg-neutral-100 dark:bg-neutral-800 border border-border-custom px-1.5 py-0.5 rounded w-fit block">
                            {getProjectName(t.projectId)}
                          </span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded ${PRIORITY_MAP[t.priority]?.bg || ""} ${PRIORITY_MAP[t.priority]?.text || ""} border ${PRIORITY_MAP[t.priority]?.border || ""}`}>
                            {t.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {t.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-[9px] font-bold uppercase tracking-wide text-red-650 dark:text-red-450 px-2 py-0.5 bg-red-100/40 rounded border border-red-200/20">
                          {days} day{days === 1 ? "" : "s"} overdue
                        </div>
                        {t.dueDateEnd && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(t.dueDateEnd).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <CheckCircle size={24} className="text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 italic">No overdue tasks. All workspace schedules are on track!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
