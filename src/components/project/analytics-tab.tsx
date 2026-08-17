"use client";

import React, { useState, useEffect } from "react";
import {
  getAnalyticsCommissioningData,
  completeLoopAction,
  createWorkOrderAction
} from "@/app/actions/enterprise";
import { LineChart, RefreshCw, BarChart2, CheckCircle2, ShieldAlert, Cpu, Settings2, Plus, Wrench, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

interface AnalyticsTabProps {
  projectId: string;
  workspaceId: string;
}

export default function AnalyticsTab({ projectId, workspaceId }: AnalyticsTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loopChecking, setLoopChecking] = useState<Record<string, boolean>>({});

  // Work Order Form State
  const [selectedAsset, setSelectedAsset] = useState("");
  const [selectedWbs, setSelectedWbs] = useState("");
  const [woNumber, setWoNumber] = useState("");
  const [woTitle, setWoTitle] = useState("");
  const [woDesc, setWoDesc] = useState("");
  const [sparesInput, setSparesInput] = useState("SPARE-GASKET:5"); // format code:qty

  const fetchData = async () => {
    setLoading(true);
    const res = await getAnalyticsCommissioningData(projectId);
    if (res.success && res.assetTags && res.wbsNodes) {
      setData(res);
      const assetTags = res.assetTags as any[];
      const wbsNodes = res.wbsNodes as any[];
      if (assetTags.length > 0) setSelectedAsset(assetTags[0].id);
      if (wbsNodes.length > 0) setSelectedWbs(wbsNodes[0].id);
    } else {
      toast.error(res.error || "Failed to fetch analytics.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleLoopCheck = async (loopId: string, status: "PASSED" | "FAILED") => {
    setLoopChecking((prev) => ({ ...prev, [loopId]: true }));
    const res = await completeLoopAction(projectId, loopId, status);
    if (res.success) {
      toast.success(`Commissioning loop ${status === "PASSED" ? "PASSED" : "FAILED"} successfully!`);
      fetchData();
    } else {
      toast.error(res.error || "Failed to check loop.");
    }
    setLoopChecking((prev) => ({ ...prev, [loopId]: false }));
  };

  const handleWorkOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !selectedWbs || !woNumber || !woTitle) {
      toast.error("Please enter work order details.");
      return;
    }

    setSubmitting(true);
    let parsedSpares: { itemCode: string; qty: number }[] = [];
    if (sparesInput.trim()) {
      try {
        parsedSpares = sparesInput.split(",").map((s) => {
          const [code, qty] = s.split(":");
          return { itemCode: code.trim().toUpperCase(), qty: parseInt(qty) || 1 };
        });
      } catch (err) {
        toast.error("Invalid spares format. Use ITEM-CODE:QTY");
        setSubmitting(false);
        return;
      }
    }

    const res = await createWorkOrderAction(
      projectId,
      selectedWbs,
      selectedAsset,
      woNumber,
      woTitle,
      woDesc,
      parsedSpares
    );

    if (res.success) {
      toast.success("Maintenance Work Order registered & spares stock issued!");
      setWoNumber("");
      setWoTitle("");
      setWoDesc("");
      fetchData();
    } else {
      toast.error(res.error || "Failed to register work order.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  const evm = data?.evm;

  return (
    <div className="space-y-6">
      {/* 1. Earned Value Management Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <BarChart2 size={16} className="text-neutral-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Earned Value (EVM) Dials</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">PV (Planned)</div>
              <div className="font-bold text-neutral-800 dark:text-neutral-200">₹{evm?.plannedValue?.toLocaleString()}</div>
            </div>
            <div className="space-y-1 border-x border-border-custom">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">AC (Actual)</div>
              <div className="font-bold text-neutral-800 dark:text-neutral-200">₹{evm?.actualCost?.toLocaleString()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">EV (Earned)</div>
              <div className="font-bold text-green-600 dark:text-green-400">₹{evm?.earnedValue?.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <LineChart size={16} className="text-neutral-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Cost & Schedule Indices</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">CPI (Cost Index)</div>
              <div className={`font-bold text-lg ${evm?.cpi >= 1.0 ? "text-green-600" : "text-red-500"}`}>
                {evm?.cpi}
              </div>
            </div>
            <div className="space-y-1 border-l border-border-custom">
              <div className="text-[9px] text-neutral-400 font-bold uppercase">SPI (Schedule Index)</div>
              <div className={`font-bold text-lg ${evm?.spi >= 1.0 ? "text-green-600" : "text-red-500"}`}>
                {evm?.spi}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm flex flex-col justify-center space-y-2">
          <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">EVM Project Status</div>
          <div className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            {evm?.status?.replaceAll("_", " ")}
          </div>
          <p className="text-[10px] text-neutral-400">
            Computed from active WBS budget ceilings vs certified client Billing claims.
          </p>
        </div>
      </div>

      {/* 2. Low-Stock Warnings Alert Section */}
      {data?.warnings?.length > 0 && (
        <div className="bg-yellow-50/50 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
            <AlertTriangle size={18} className="animate-bounce" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Low Stock Inventory Warnings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-medium">
            {data.warnings.map((warn: any) => (
              <div key={warn.itemCode} className="bg-surface border border-border-custom rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{warn.name}</span>
                  <div className="text-[9px] text-neutral-400 font-mono mt-0.5">{warn.itemCode}</div>
                </div>
                <div className="text-right">
                  <span className="text-red-500 font-bold">{warn.currentStock} left</span>
                  <div className="text-[8px] text-neutral-400 uppercase font-bold">Limit: {warn.reorderLevel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Commissioning Register and Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commissioning Systems and Handovers */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Cpu size={16} className="text-neutral-500" />
            <span>Commissioning & Mechanical Handovers</span>
          </h2>

          <div className="space-y-4">
            {data?.systems?.length === 0 ? (
              <div className="bg-surface border border-border-custom rounded-2xl p-8 text-center text-xs text-neutral-450">
                No commissioning check sheets seed found. Handovers are active upon WBS loop test completion.
              </div>
            ) : (
              data?.systems?.map((sys: any) => (
                <div key={sys.id} className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border-custom">
                    <div>
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{sys.systemCode}</span>
                      <span className="text-neutral-400 font-semibold ml-2">— {sys.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      sys.status === "COMMISSIONED"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                    }`}>
                      {sys.status}
                    </span>
                  </div>

                  {/* Loops table */}
                  <div className="space-y-2">
                    {sys.loops?.map((loop: any) => (
                      <div key={loop.id} className="flex justify-between items-center py-1 font-semibold text-[11px]">
                        <div className="text-neutral-600 dark:text-neutral-400">
                          {loop.loopTag} ({loop.status})
                        </div>
                        <div className="flex gap-2">
                          {loop.status === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleLoopCheck(loop.id, "PASSED")}
                                disabled={loopChecking[loop.id]}
                                className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] uppercase font-bold"
                              >
                                Pass
                              </button>
                              <button
                                onClick={() => handleLoopCheck(loop.id, "FAILED")}
                                disabled={loopChecking[loop.id]}
                                className="bg-red-600 text-white px-2 py-0.5 rounded text-[9px] uppercase font-bold"
                              >
                                Fail
                              </button>
                            </>
                          ) : loop.status === "PASSED" ? (
                            <span className="text-green-500 font-bold uppercase text-[9px]">Passed</span>
                          ) : (
                            <span className="text-red-500 font-bold uppercase text-[9px]">Failed</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance Work Orders and Spares */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Wrench size={16} className="text-neutral-500" />
            <span>Asset Maintenance WO</span>
          </h2>

          <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
            <form onSubmit={handleWorkOrderSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Asset Tag</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                >
                  {data?.assetTags?.length === 0 ? (
                    <option value="">No assets registered. Commission loops first.</option>
                  ) : (
                    data?.assetTags?.map((ast: any) => (
                      <option key={ast.id} value={ast.id}>
                        {ast.assetCode} - {ast.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">WBS Node Front</label>
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Work Order No</label>
                <input
                  type="text"
                  placeholder="e.g. WO-2026-CHW-001"
                  value={woNumber}
                  onChange={(e) => setWoNumber(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pump Seal Replacement"
                  value={woTitle}
                  onChange={(e) => setWoTitle(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Logged leakage, replaced neoprene seal rings"
                  value={woDesc}
                  onChange={(e) => setWoDesc(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Spares Consumption (ITEM-CODE:QTY)</label>
                <input
                  type="text"
                  value={sparesInput}
                  onChange={(e) => setSparesInput(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || data?.assetTags?.length === 0}
                className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? "Saving Work Order..." : "Submit Maintenance WO"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
