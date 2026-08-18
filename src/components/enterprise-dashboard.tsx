"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Folder,
  CheckCircle2,
  Coins,
  TrendingUp,
  Database,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  Loader2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { WorkspaceDashboardStats } from "@/app/actions/dashboard";
import { actOnApprovalAction } from "@/app/actions/approvals";
import { toast } from "react-hot-toast";

interface EnterpriseDashboardProps {
  stats: WorkspaceDashboardStats;
}

export default function EnterpriseDashboard({ stats }: EnterpriseDashboardProps) {
  const [approvingIds, setApprovingIds] = useState<Record<string, boolean>>({});
  const [rejectingIds, setRejectingIds] = useState<Record<string, boolean>>({});
  const [localApprovals, setLocalApprovals] = useState(stats.pendingApprovals);

  // Time formatter
  const formattedTime = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  const handleApproval = async (signoffId: string, approvalId: string, action: "APPROVED" | "REJECTED") => {
    if (!signoffId) {
      toast.error("No active signoff step found for this request.");
      return;
    }

    if (action === "APPROVED") {
      setApprovingIds((prev) => ({ ...prev, [approvalId]: true }));
    } else {
      setRejectingIds((prev) => ({ ...prev, [approvalId]: true }));
    }

    try {
      const res = await actOnApprovalAction(signoffId, action, `${action} via Live Management Dashboard`);
      if (res.success) {
        toast.success(`Request successfully ${action.toLowerCase()}!`);
        // Remove from list locally
        setLocalApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      } else {
        toast.error(res.error || "Failed to act on approval request.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      if (action === "APPROVED") {
        setApprovingIds((prev) => ({ ...prev, [approvalId]: false }));
      } else {
        setRejectingIds((prev) => ({ ...prev, [approvalId]: false }));
      }
    }
  };

  // Compute SVG Donut properties
  const breakdown = stats.projectBreakdown;
  const totalPrj = breakdown.total || 1;
  const prjAngles = {
    completed: (breakdown.completed / totalPrj) * 100,
    onTrack: (breakdown.onTrack / totalPrj) * 100,
    atRisk: (breakdown.atRisk / totalPrj) * 100,
    delayed: (breakdown.delayed / totalPrj) * 100,
  };

  // Helper for Indian Rupees Crore / Lakh format
  const formatRupees = (val: number) => {
    if (val >= 10000000) {
      return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹ ${(val / 100000).toFixed(2)} L`;
    }
    return `₹ ${val.toLocaleString("en-IN")}`;
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 pb-12 select-none">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-custom pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            Live Management Dashboard
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </h1>
          <p className="text-[10px] text-neutral-400 font-medium tracking-wide uppercase mt-1">
            Last updated: {formattedTime}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/projects"
            className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            Manage Projects
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── 1. Top Row: Key Performance Indicators (KPIs) ───────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Projects */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Projects</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500">
              <Folder size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{stats.totalProjects}</div>
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 12%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Active Tasks */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Tasks</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{stats.activeTasks}</div>
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 8%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Revenue */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-500">
              <Coins size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white truncate">
              {formatRupees(stats.totalRevenue)}
            </div>
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 18%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Purchase Value */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Purchase Value</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-500">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white truncate">
              {formatRupees(stats.purchaseValue)}
            </div>
            <div className="text-[9px] text-orange-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 5%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Inventory Value */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Inventory Value</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-teal-500">
              <Database size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white truncate">
              {formatRupees(stats.inventoryValue)}
            </div>
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 7%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>

        {/* KPI 6: Gross Profit */}
        <div className="bg-surface border border-border-custom rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gross Profit</span>
            <div className="w-7 h-7 rounded-lg bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center text-pink-500">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-extrabold tracking-tight text-neutral-900 dark:text-white truncate">
              {formatRupees(stats.grossProfit)}
            </div>
            <div className="text-[9px] text-green-500 font-bold flex items-center gap-1 mt-1">
              <span>▲ 14%</span>
              <span className="text-neutral-400 font-normal">vs last month</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Middle Row: Core Analytics Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Progress Overview */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Project Progress Overview</span>
            <span className="text-[10px] font-bold text-neutral-400">{stats.totalProjects} Projects</span>
          </div>

          <div className="flex items-center justify-around py-4">
            {/* SVG Donut */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                
                {/* Completed */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3.5"
                  strokeDasharray={`${prjAngles.completed} ${100 - prjAngles.completed}`}
                  strokeDashoffset="0"
                />
                
                {/* On Track */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3.5"
                  strokeDasharray={`${prjAngles.onTrack} ${100 - prjAngles.onTrack}`}
                  strokeDashoffset={-prjAngles.completed}
                />

                {/* At Risk */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3.5"
                  strokeDasharray={`${prjAngles.atRisk} ${100 - prjAngles.atRisk}`}
                  strokeDashoffset={-(prjAngles.completed + prjAngles.onTrack)}
                />

                {/* Delayed */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3.5"
                  strokeDasharray={`${prjAngles.delayed} ${100 - prjAngles.delayed}`}
                  strokeDashoffset={-(prjAngles.completed + prjAngles.onTrack + prjAngles.atRisk)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-neutral-800 dark:text-white">{stats.totalProjects}</span>
                <span className="text-[7px] text-neutral-400 font-bold uppercase tracking-wider">Total</span>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-1.5 text-[9px] font-bold text-neutral-500 pl-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>Completed: {breakdown.completed} ({Math.round(prjAngles.completed)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>On Track: {breakdown.onTrack} ({Math.round(prjAngles.onTrack)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>At Risk: {breakdown.atRisk} ({Math.round(prjAngles.atRisk)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <span>Delayed: {breakdown.delayed} ({Math.round(prjAngles.delayed)}%)</span>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/projects"
            className="text-[9px] font-bold text-blue-500 hover:underline text-center mt-3 border-t border-border-custom pt-3 block"
          >
            View all projects →
          </Link>
        </div>

        {/* Top 5 Projects by Budget Utilization */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Budget Utilization (Top 5)</span>
            <span className="text-[8px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
              Real EVM
            </span>
          </div>

          <div className="space-y-4">
            {stats.topProjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">No active budgets loaded.</div>
            ) : (
              stats.topProjects.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-neutral-800 dark:text-neutral-200 truncate max-w-[150px]">{p.name}</span>
                    <span className="text-neutral-500">{p.utilization}% ({formatRupees(p.actual)})</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.utilization > 100
                          ? "bg-red-500 animate-pulse"
                          : p.utilization > 90
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(100, p.utilization)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            href="/dashboard/projects"
            className="text-[9px] font-bold text-blue-500 hover:underline text-center mt-3 border-t border-border-custom pt-3 block"
          >
            View financial WBS matrix →
          </Link>
        </div>

        {/* Critical Alerts Panel */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-3">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Critical Alerts</span>
            <span className="text-[10px] font-mono text-red-500 font-bold bg-red-500/10 px-1.5 py-0.2 rounded-full">
              {stats.criticalAlerts.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] pr-1 space-y-2.5 no-scrollbar">
            {stats.criticalAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">All systems green. No active alerts.</div>
            ) : (
              stats.criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex gap-2.5 items-start p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/30 border border-border-custom text-neutral-850 dark:text-neutral-150"
                >
                  <AlertTriangle
                    size={14}
                    className={`shrink-0 mt-0.5 ${
                      alert.type === "QC_HOLD"
                        ? "text-red-500 animate-pulse"
                        : alert.type === "LOW_STOCK"
                        ? "text-amber-500"
                        : "text-blue-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] font-extrabold truncate">{alert.title}</div>
                    <div className="text-[8px] text-neutral-400 leading-normal mt-0.5 line-clamp-2">
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Bottom Row: Approvals & Task Lists ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Approvals */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Pending Approvals</span>
            <span className="text-[10px] font-mono text-neutral-400">{localApprovals.length} awaiting review</span>
          </div>

          <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto no-scrollbar">
            {localApprovals.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">No pending approvals waiting.</div>
            ) : (
              localApprovals.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border-custom bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-all"
                >
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="text-[10px] font-extrabold text-neutral-800 dark:text-neutral-200 truncate uppercase">
                      {app.title}
                    </div>
                    <div className="text-[8px] text-neutral-400 font-mono mt-0.5">
                      Requested by: {app.requestedBy} • {app.amount ? formatRupees(app.amount) : "N/A"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => handleApproval(app.signoffId, app.id, "APPROVED")}
                      disabled={approvingIds[app.id] || rejectingIds[app.id]}
                      className="p-1 rounded-lg bg-green-500/10 hover:bg-green-500/25 text-green-600 transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Approve"
                    >
                      {approvingIds[app.id] ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </button>
                    <button
                      onClick={() => handleApproval(app.signoffId, app.id, "REJECTED")}
                      disabled={approvingIds[app.id] || rejectingIds[app.id]}
                      className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-600 transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Reject"
                    >
                      {rejectingIds[app.id] ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <X size={12} strokeWidth={3} />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Overdue Tasks */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border-custom pb-3 mb-4">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Top Overdue Tasks</span>
            <span className="text-[10px] font-mono text-red-500 font-bold bg-red-500/15 px-1.5 py-0.2 rounded-full">
              {stats.overdueTasks.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 max-h-[220px] overflow-y-auto no-scrollbar">
            {stats.overdueTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">All tasks completed on schedule.</div>
            ) : (
              stats.overdueTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border-custom bg-surface hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold text-neutral-800 dark:text-neutral-200 truncate">
                      {t.title}
                    </div>
                    <div className="text-[8px] text-neutral-400 font-medium truncate mt-0.5">
                      Project: {t.projectName}
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-3 pl-1">
                    <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-lg">
                      {t.daysOverdue} days
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Executive Insights */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 border-b border-border-custom pb-3 mb-4 text-xs font-bold text-neutral-800 dark:text-neutral-200">
            <Sparkles size={14} className="text-purple-500" />
            <span>AI Executive Insights</span>
          </div>

          <div className="space-y-3 text-[10px] leading-relaxed text-neutral-600 dark:text-neutral-400 flex-1">
            <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-0.5">
              <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wide text-[8px]">
                Cost Optimization
              </span>
              <p className="text-[9px] leading-normal font-medium text-neutral-700 dark:text-neutral-300">
                Lignite and cement stock prices are projected to rise next month. Consolidate pending purchase requests now to lock in current rates.
              </p>
            </div>
            
            <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-0.5">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide text-[8px]">
                Risk Mitigation
              </span>
              <p className="text-[9px] leading-normal font-medium text-neutral-700 dark:text-neutral-300">
                Two WBS project nodes are on Quality hold due to open NCRs. Work on those packages will hold up critical billing targets by Friday.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
