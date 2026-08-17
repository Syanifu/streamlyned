"use client";

import React, { useState, useEffect } from "react";
import { getProjectInventoryData, postMaterialIssueAction } from "@/app/actions/enterprise";
import { Database, Plus, RefreshCw, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface InventoryTabProps {
  projectId: string;
  workspaceId: string;
}

export default function InventoryTab({ projectId, workspaceId }: InventoryTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedWbs, setSelectedWbs] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [issueQty, setIssueQty] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    const res = await getProjectInventoryData(projectId);
    if (res.success && res.wbsNodes && res.stockBalances) {
      setData(res);
      const wbsNodes = res.wbsNodes as any[];
      const stockBalances = res.stockBalances as any[];
      if (wbsNodes.length > 0) setSelectedWbs(wbsNodes[0].id);
      if (stockBalances.length > 0) setSelectedItem(stockBalances[0].code);
    } else {
      toast.error(res.error || "Failed to fetch inventory.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWbs || !selectedItem || issueQty <= 0) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    const wbsNode = data.wbsNodes.find((n: any) => n.id === selectedWbs);
    const res = await postMaterialIssueAction(
      projectId,
      wbsNode.code,
      [{ itemCode: selectedItem, quantity: issueQty }]
    );

    if (res.success) {
      toast.success("Materials successfully issued and charged to WBS Node!");
      setIssueQty(1);
      fetchData();
    } else {
      toast.error(res.error || "Failed to issue materials.");
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stock Balance List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <Database size={16} className="text-neutral-500" />
            <span>Warehouse Stock Balances</span>
          </h2>
          <button
            onClick={fetchData}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-border-custom text-neutral-500 uppercase tracking-wider font-bold">
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Name</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3 text-right">Available Stock</th>
                <th className="px-4 py-3 text-right">MAC Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom font-medium">
              {data?.stockBalances?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-neutral-400">
                    No active inventory stocks seed found.
                  </td>
                </tr>
              ) : (
                data?.stockBalances?.map((stock: any) => (
                  <tr key={stock.code} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">
                      {stock.code}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {stock.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 px-2 py-0.5 rounded text-[10px]">
                        {stock.group}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-white">
                      {stock.quantity} <span className="text-[10px] text-neutral-400 font-normal">{stock.uom}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-500">
                      ₹{stock.rate.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Issue Form */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Send size={16} className="text-neutral-500" />
          <span>Issue Materials to Site</span>
        </h2>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <form onSubmit={handleIssueSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                WBS Cost Front
              </label>
              <select
                value={selectedWbs}
                onChange={(e) => setSelectedWbs(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-500 transition-colors"
              >
                {data?.wbsNodes?.map((node: any) => (
                  <option key={node.id} value={node.id}>
                    WBS {node.code} - {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Item to Issue
              </label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-500 transition-colors"
              >
                {data?.stockBalances?.map((stock: any) => (
                  <option key={stock.code} value={stock.code}>
                    {stock.code} - {stock.name} ({stock.quantity} left)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Issue Quantity
              </label>
              <input
                type="number"
                min={1}
                value={issueQty}
                onChange={(e) => setIssueQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-neutral-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider text-xs py-2.5 rounded-xl transition-all hover:bg-neutral-800 dark:hover:bg-neutral-100 flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Plus size={12} />
              )}
              <span>Post Material Issue</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
