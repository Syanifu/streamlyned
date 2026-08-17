"use client";

import React, { useState, useEffect } from "react";
import {
  getProcurementBillingData,
  createClientContractAction,
  createDraftRaBillAction,
  certifyRaBillAction
} from "@/app/actions/enterprise";
import { Coins, FileText, Plus, RefreshCw, Landmark, CheckCircle, Scale } from "lucide-react";
import { toast } from "react-hot-toast";

interface BillingTabProps {
  projectId: string;
  workspaceId: string;
}

export default function BillingTab({ projectId, workspaceId }: BillingTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contractSubmitting, setContractSubmitting] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [certifySubmitting, setCertifySubmitting] = useState<Record<string, boolean>>({});

  // Contract Form State
  const [contractCode, setContractCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [contractValue, setContractValue] = useState(5000000);
  const [advancePercent, setAdvancePercent] = useState(10);
  const [recoveryPercent, setRecoveryPercent] = useState(15);
  const [retentionPercent, setRetentionPercent] = useState(5);

  // Claim Form State
  const [billingDate, setBillingDate] = useState("");
  const [claimQuantities, setClaimQuantities] = useState<Record<string, number>>({});
  const [claimRates, setClaimRates] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    const res = await getProcurementBillingData(projectId);
    if (res.success) {
      setData(res);
      // Pre-fill default claim quantities/rates
      const initialQtys: Record<string, number> = {};
      const initialRates: Record<string, number> = {};
      res.wbsNodes?.forEach((node: any) => {
        initialQtys[node.id] = 0;
        initialRates[node.id] = 1500; // default rate
      });
      setClaimQuantities(initialQtys);
      setClaimRates(initialRates);
    } else {
      toast.error(res.error || "Failed to fetch billing data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractCode || !clientName) {
      toast.error("Please fill in contract details.");
      return;
    }
    setContractSubmitting(true);
    const res = await createClientContractAction(
      projectId,
      contractCode,
      clientName,
      contractValue,
      advancePercent,
      recoveryPercent,
      retentionPercent
    );
    if (res.success) {
      toast.success("Client Contract registered. Balanced mobilization entries posted!");
      fetchData();
    } else {
      toast.error(res.error || "Failed to create contract.");
    }
    setContractSubmitting(false);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingDate) {
      toast.error("Please enter a billing date.");
      return;
    }
    if (!data?.contracts || data.contracts.length === 0) {
      toast.error("Please register a client contract first.");
      return;
    }

    const claims = Object.keys(claimQuantities)
      .filter((nodeId) => claimQuantities[nodeId] > 0)
      .map((nodeId) => ({
        wbsNodeId: nodeId,
        quantityClaimed: claimQuantities[nodeId],
        rate: claimRates[nodeId] || 1500,
      }));

    if (claims.length === 0) {
      toast.error("Please enter a quantity claimed for at least one WBS Node.");
      return;
    }

    setClaimSubmitting(true);
    const res = await createDraftRaBillAction(
      projectId,
      data.contracts[0].id,
      billingDate,
      claims
    );

    if (res.success) {
      toast.success("Draft claim RA Bill successfully generated!");
      setBillingDate("");
      fetchData();
    } else {
      toast.error(res.error || "Failed to generate claim.");
    }
    setClaimSubmitting(false);
  };

  const handleCertifyBill = async (billId: string) => {
    setCertifySubmitting((prev) => ({ ...prev, [billId]: true }));
    const res = await certifyRaBillAction(projectId, billId);
    if (res.success) {
      toast.success("RA Bill Certified! Retention entries and recoveries reconciled successfully.");
      fetchData();
    } else {
      toast.error(res.error || "Failed to certify bill.");
    }
    setCertifySubmitting((prev) => ({ ...prev, [billId]: false }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-neutral-400 dark:text-neutral-500" />
      </div>
    );
  }

  const hasContract = data?.contracts?.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Billing Table and Contract Info */}
      <div className="lg:col-span-2 space-y-6">
        {/* Contract Info Card */}
        {hasContract ? (
          <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <Landmark size={18} className="text-neutral-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Active Client Contract</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <div className="text-neutral-400 font-bold uppercase text-[9px]">Contract Code</div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">{data.contracts[0].contractCode}</div>
              </div>
              <div className="space-y-1">
                <div className="text-neutral-400 font-bold uppercase text-[9px]">Client Name</div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">{data.contracts[0].clientName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-neutral-400 font-bold uppercase text-[9px]">Value Limit</div>
                <div className="font-bold text-neutral-900 dark:text-white">₹{data.contracts[0].totalValue.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-neutral-400 font-bold uppercase text-[9px]">Retention Rate</div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">{data.contracts[0].retentionPercentage}%</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
              <Landmark size={18} className="text-neutral-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Register Client Contract</h3>
            </div>
            <form onSubmit={handleContractSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Contract Code</label>
                <input
                  type="text"
                  placeholder="e.g. CON-METRO-001"
                  value={contractCode}
                  onChange={(e) => setContractCode(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Delhi Metro Rail Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Contract Value (INR)</label>
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Mobilization Advance (%)</label>
                <input
                  type="number"
                  value={advancePercent}
                  onChange={(e) => setAdvancePercent(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
                />
              </div>
              <div className="col-span-1 md:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={contractSubmitting}
                  className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all"
                >
                  {contractSubmitting ? "Submitting..." : "Initialize Contract & Post Advances"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RA Bills List */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
            <FileText size={16} className="text-neutral-500" />
            <span>Running Account (RA) Claims</span>
          </h2>

          <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-border-custom text-neutral-500 uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">Billing Date</th>
                  <th className="px-4 py-3 text-right">Claim Value</th>
                  <th className="px-4 py-3 text-right">Certified Value</th>
                  <th className="px-4 py-3 text-right">Retention</th>
                  <th className="px-4 py-3 text-right">Adv. Recovery</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom font-medium">
                {data?.raBills?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-neutral-400">
                      No client claims found. Register contract and create draft below.
                    </td>
                  </tr>
                ) : (
                  data?.raBills?.map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3 text-neutral-800 dark:text-neutral-200">
                        {new Date(bill.billingDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        ₹{bill.claimedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-bold">
                        ₹{bill.certifiedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-500">
                        ₹{bill.retentionDeduction.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-500">
                        ₹{bill.advanceRecoveryDeduction.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          bill.status === "CERTIFIED"
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {bill.status === "DRAFT" ? (
                          <button
                            onClick={() => handleCertifyBill(bill.id)}
                            disabled={certifySubmitting[bill.id]}
                            className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-800 disabled:opacity-50"
                          >
                            {certifySubmitting[bill.id] ? "Processing..." : "Certify"}
                          </button>
                        ) : (
                          <span className="text-green-500 flex items-center justify-center"><CheckCircle size={14} /></span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Claim Submission Sidebar */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
          <Scale size={16} className="text-neutral-500" />
          <span>New Progress Claim</span>
        </h2>

        <div className="bg-surface border border-border-custom rounded-2xl p-5 shadow-sm space-y-4">
          <form onSubmit={handleClaimSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Billing Date</label>
              <input
                type="date"
                required
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-xl px-3 py-2 font-semibold"
              />
            </div>

            <div className="space-y-2 border-t border-border-custom pt-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Claim Values by WBS Node</label>
              {data?.wbsNodes?.map((node: any) => (
                <div key={node.id} className="grid grid-cols-3 gap-2 items-center py-1">
                  <div className="font-semibold text-neutral-800 dark:text-neutral-200 overflow-hidden text-ellipsis whitespace-nowrap">
                    WBS {node.code}
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Qty Claim"
                      value={claimQuantities[node.id] || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setClaimQuantities((prev) => ({ ...prev, [node.id]: val }));
                      }}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2 py-1 font-semibold text-right"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Rate"
                      value={claimRates[node.id] || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setClaimRates((prev) => ({ ...prev, [node.id]: val }));
                      }}
                      className="w-full bg-surface border border-border-custom rounded-lg px-2 py-1 font-semibold text-right"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={claimSubmitting || !hasContract}
              className="w-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all disabled:opacity-50"
            >
              {claimSubmitting ? "Generating Claim..." : "Create Draft Claim"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
