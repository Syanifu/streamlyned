"use client";

import React, { useState, useEffect } from "react";
import {
  getDrawingsQcData,
  createDrawingDocumentAction,
  releaseDrawingRevisionAction,
  createItpInspectionAction,
  completeInspectionAction,
  resolveNcrAction
} from "@/app/actions/enterprise";
import { FileCheck, Plus, RefreshCw, AlertTriangle, CheckSquare, Layers, FileCode, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface DrawingsTabProps {
  projectId: string;
  workspaceId: string;
}

export default function DrawingsTab({ projectId, workspaceId }: DrawingsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Submitting States
  const [dwgSubmitting, setDwgSubmitting] = useState(false);
  const [releaseSubmitting, setReleaseSubmitting] = useState<Record<string, boolean>>({});
  const [itpSubmitting, setItpSubmitting] = useState(false);
  const [inspectSubmitting, setInspectSubmitting] = useState<Record<string, boolean>>({});
  const [ncrSubmitting, setNcrSubmitting] = useState<Record<string, boolean>>({});

  // Drawing Form State
  const [dwgNumber, setDwgNumber] = useState("");
  const [dwgTitle, setDwgTitle] = useState("");
  const [dwgDiscipline, setDwgDiscipline] = useState("STRUCTURAL");
  const [dwgRev, setDwgRev] = useState("R0");

  // Release Form State (stored per drawing in map)
  const [releaseWbs, setReleaseWbs] = useState<Record<string, string>>({});

  // Inspection Form State
  const [selectedWbs, setSelectedWbs] = useState("");
  const [checklistTitle, setChecklistTitle] = useState("");
  const [checklistItems, setChecklistItems] = useState("1. Reinforcement check\n2. Cover spacing check\n3. Pour cleanliness");

  const fetchData = async () => {
    setLoading(true);
    const res = await getDrawingsQcData(projectId);
    if (res.success && res.wbsNodes) {
      setData(res);
      const wbsNodes = res.wbsNodes as any[];
      if (wbsNodes.length > 0) setSelectedWbs(wbsNodes[0].id);
    } else {
      toast.error(res.error || "Failed to fetch Drawings/QC.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleDwgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dwgNumber || !dwgTitle) {
      toast.error("Please enter drawing details.");
      return;
    }
    setDwgSubmitting(true);
    const res = await createDrawingDocumentAction(projectId, dwgNumber, dwgTitle, dwgDiscipline, dwgRev);
    if (res.success) {
      toast.success("Drawing registered as DRAFT.");
      setDwgNumber("");
      setDwgTitle("");
      fetchData();
    } else {
      toast.error(res.error || "Failed to register drawing.");
    }
    setDwgSubmitting(false);
  };

  const handleReleaseRevision = async (drawingId: string, revNum: string) => {
    const wbsStr = releaseWbs[drawingId];
    if (!wbsStr) {
      toast.error("Please enter WBS code to map to (e.g. 1.1).");
      return;
    }
    setReleaseSubmitting((prev) => ({ ...prev, [drawingId]: true }));
    const res = await releaseDrawingRevisionAction(
      projectId,
      drawingId,
      revNum,
      wbsStr.split(",").map((s) => s.trim())
    );
    if (res.success) {
      toast.success("Drawing Revision Released to IFC and Transmitted!");
      fetchData();
    } else {
      toast.error(res.error || "Failed to release revision.");
    }
    setReleaseSubmitting((prev) => ({ ...prev, [drawingId]: false }));
  };

  const handleItpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWbs || !checklistTitle) {
      toast.error("Please fill in checklist details.");
      return;
    }
    setItpSubmitting(true);
    const itemsArray = checklistItems.split("\n").map((s) => s.replace(/^\d+\.\s*/, "").trim());
    const res = await createItpInspectionAction(
      projectId,
      selectedWbs,
      checklistTitle,
      JSON.stringify(itemsArray)
    );
    if (res.success) {
      toast.success("ITP Quality Checklist Inspection Request raised.");
      setChecklistTitle("");
      fetchData();
    } else {
      toast.error(res.error || "Failed to create inspection request.");
    }
    setItpSubmitting(false);
  };

  const handleCompleteInspection = async (requestId: string, status: "PASSED" | "FAILED") => {
    setInspectSubmitting((prev) => ({ ...prev, [requestId]: true }));
    const res = await completeInspectionAction(
      projectId,
      requestId,
      status,
      status === "PASSED" ? "Checklist items pass QA specifications." : "Failed to meet compression core limits."
    );
    if (res.success) {
      if (status === "FAILED") {
        toast.error("Inspection FAILED! Non-Conformance Report (NCR) opened. WBS Node claims blocked!");
      } else {
        toast.success("Inspection PASSED successfully.");
      }
      fetchData();
    } else {
      toast.error(res.error || "Failed to complete inspection.");
    }
    setInspectSubmitting((prev) => ({ ...prev, [requestId]: false }));
  };

  const handleResolveNcr = async (ncrId: string) => {
    setNcrSubmitting((prev) => ({ ...prev, [ncrId]: true }));
    const res = await resolveNcrAction(projectId, ncrId, "REWORK");
    if (res.success) {
      toast.success("NCR Resolved! Site rework complete and WBS Node billing block removed.");
      fetchData();
    } else {
      toast.error(res.error || "Failed to resolve NCR.");
    }
    setNcrSubmitting((prev) => ({ ...prev, [ncrId]: false }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Drawings Register Column */}
      <div className="xl:col-span-2 space-y-6">
        {/* Register Drawings Form */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <FileCode size={18} className="text-neutral-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Register Drawing Sheets</h3>
          </div>
          <form onSubmit={handleDwgSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Sheet Number</label>
              <input
                type="text"
                placeholder="e.g. METRO-STR-101"
                value={dwgNumber}
                onChange={(e) => setDwgNumber(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Sheet Title</label>
              <input
                type="text"
                placeholder="e.g. Foundation & Reinforcement Layout"
                value={dwgTitle}
                onChange={(e) => setDwgTitle(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={dwgSubmitting}
                className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all"
              >
                {dwgSubmitting ? "Creating..." : "Save Draft"}
              </button>
            </div>
          </form>
        </div>

        {/* Drawings List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Layers size={16} className="text-neutral-500" />
            <span>Project Drawings & IFC Release</span>
          </h2>

          <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-border-custom text-neutral-500 uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">Dwg Number</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Discipline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Transmit WBS</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom font-medium">
                {data?.drawings?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-neutral-400">
                      No drawings registered yet. Use form above to add sheets.
                    </td>
                  </tr>
                ) : (
                  data?.drawings?.map((dwg: any) => {
                    const latestRev = dwg.revisions[dwg.revisions.length - 1];
                    const isDraft = latestRev?.status === "DRAFT";
                    return (
                      <tr key={dwg.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">
                          {dwg.drawingNumber}
                        </td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {dwg.title}
                        </td>
                        <td className="px-4 py-3 text-neutral-500">{dwg.discipline}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            latestRev?.status === "IFC"
                              ? "bg-green-150 text-green-700 dark:bg-green-950 dark:text-green-400"
                              : "bg-yellow-150 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                          }`}>
                            {latestRev?.status || "DRAFT"} ({latestRev?.revisionNumber || "R0"})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isDraft ? (
                            <input
                              type="text"
                              placeholder="e.g. 1.1, 1.2"
                              value={releaseWbs[dwg.id] || ""}
                              onChange={(e) => setReleaseWbs((prev) => ({ ...prev, [dwg.id]: e.target.value }))}
                              className="bg-surface border border-border-custom rounded-lg px-2 py-1 font-semibold w-24 text-[10px]"
                            />
                          ) : (
                            <span className="text-neutral-400 font-mono text-[10px]">Transmitted</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isDraft ? (
                            <button
                              onClick={() => handleReleaseRevision(dwg.id, latestRev.revisionNumber)}
                              disabled={releaseSubmitting[dwg.id]}
                              className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                            >
                              {releaseSubmitting[dwg.id] ? "Releasing..." : "Release IFC"}
                            </button>
                          ) : (
                            <span className="text-green-500 font-bold text-[10px] flex items-center justify-center gap-1">
                              <CheckCircle size={10} /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QC & ITP Inspections / NCRs Column */}
      <div className="space-y-6">
        {/* Raise ITP Form */}
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <CheckSquare size={18} className="text-neutral-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Raise ITP Quality Checklist</h3>
          </div>
          <form onSubmit={handleItpSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">WBS Node ID</label>
              <select
                value={selectedWbs}
                onChange={(e) => setSelectedWbs(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
              >
                {data?.wbsNodes?.map((node: any) => (
                  <option key={node.id} value={node.id}>
                    WBS {node.code} - {node.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Checklist Activity</label>
              <input
                type="text"
                placeholder="e.g. Concrete Compressive Strength"
                value={checklistTitle}
                onChange={(e) => setChecklistTitle(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Checklist Items (New Line per item)</label>
              <textarea
                rows={3}
                value={checklistItems}
                onChange={(e) => setChecklistItems(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={itpSubmitting}
              className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all"
            >
              {itpSubmitting ? "Raising Request..." : "Create Quality Checklist"}
            </button>
          </form>
        </div>

        {/* Inspections & NCR Register */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <AlertTriangle size={16} className="text-red-500 animate-pulse" />
            <span>Inspection Requests & NCRs</span>
          </h2>

          {/* ITP Checklists List */}
          <div className="space-y-3">
            {data?.inspections?.map((insp: any) => (
              <div key={insp.id} className="bg-surface border border-border-custom rounded-2xl p-4 shadow-sm space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{insp.checklistTitle}</span>
                    <div className="text-[10px] text-neutral-400 font-mono">WBS {insp.wbsNode?.code}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    insp.status === "PASSED"
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : insp.status === "FAILED"
                      ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                  }`}>
                    {insp.status}
                  </span>
                </div>
                {insp.status === "PENDING" && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-border-custom">
                    <button
                      onClick={() => handleCompleteInspection(insp.id, "PASSED")}
                      disabled={inspectSubmitting[insp.id]}
                      className="bg-green-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => handleCompleteInspection(insp.id, "FAILED")}
                      disabled={inspectSubmitting[insp.id]}
                      className="bg-red-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                    >
                      Fail
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* NCR List */}
          {data?.ncrs?.length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
                <XCircle size={12} />
                <span>Open Non-Conformance Reports</span>
              </h3>
              {data?.ncrs?.map((ncr: any) => (
                <div key={ncr.id} className="bg-red-50/50 border border-red-200 dark:bg-red-950/20 dark:border-red-900 rounded-2xl p-4 shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-red-800 dark:text-red-300">{ncr.ncrNumber}</span>
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">{ncr.description}</p>
                      <div className="text-[9px] text-neutral-400 font-mono mt-1">WBS Cost Front: {ncr.wbsNode?.code}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      ncr.status === "RESOLVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {ncr.status}
                    </span>
                  </div>
                  {ncr.status === "OPEN" && (
                    <div className="flex justify-end pt-2 border-t border-red-100 dark:border-red-900">
                      <button
                        onClick={() => handleResolveNcr(ncr.id)}
                        disabled={ncrSubmitting[ncr.id]}
                        className="bg-red-900 text-white dark:bg-white dark:text-neutral-950 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                      >
                        {ncrSubmitting[ncr.id] ? "Resolving..." : "Log Rework & Resolve"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
