"use client";

import React, { useState, useEffect } from "react";
import { getMasterAccountsData, createChartOfAccountsAction } from "@/app/actions/master";
import { Coins, Plus, Search, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function MasterAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"coa" | "gl" | "purchase" | "sales">("coa");

  // Form states
  const [coaCode, setCoaCode] = useState("");
  const [coaName, setCoaName] = useState("");
  const [coaType, setCoaType] = useState("EXPENSE");
  const [creatingCoa, setCreatingCoa] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getMasterAccountsData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to fetch master accounts.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCoaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coaCode || !coaName) {
      toast.error("Please fill in account details.");
      return;
    }
    setCreatingCoa(true);
    const res = await createChartOfAccountsAction(coaCode, coaName, coaType);
    if (res.success) {
      toast.success("Account created successfully in Chart of Accounts!");
      setCoaCode("");
      setCoaName("");
      loadData();
    } else {
      toast.error(res.error || "Failed to create account.");
    }
    setCreatingCoa(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const coa = data?.coa || [];
  const ledgerEntries = data?.ledgerEntries || [];
  const purchaseInvoices = data?.purchaseInvoices || [];
  const salesInvoices = data?.salesInvoices || [];
  const summary = data?.summary || { totalDebit: 0, totalCredit: 0, netCashFlow: 0 };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="border-b border-border-custom pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Coins size={20} className="text-brand-accent" />
            Master Accounts &amp; Finance
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            General ledger postings, Chart of Accounts structure, supplier invoices, and customer billing.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Ledger Debits</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            ₹ {summary.totalDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Ledger Credits</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            ₹ {summary.totalCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Net Cash Flow (Certified Collection vs Paid)</span>
          <div className={`text-2xl font-black mt-1 ${summary.netCashFlow >= 0 ? "text-green-500" : "text-red-500"}`}>
            ₹ {summary.netCashFlow.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-border-custom flex gap-1">
        <button
          onClick={() => {
            setActiveTab("coa");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "coa"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => {
            setActiveTab("gl");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "gl"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          General Ledger
        </button>
        <button
          onClick={() => {
            setActiveTab("purchase");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "purchase"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Purchase Invoices
        </button>
        <button
          onClick={() => {
            setActiveTab("sales");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "sales"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Sales Invoices
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === "coa" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Chart of Accounts list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search Chart of Accounts by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
              />
            </div>

            <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="p-3">Account Code</th>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coa.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-neutral-400">
                          Chart of Accounts is empty. Create your first ledger account.
                        </td>
                      </tr>
                    ) : (
                      coa
                        .filter(
                          (c: any) =>
                            c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((acc: any) => (
                          <tr key={acc.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                            <td className="p-3 font-bold text-neutral-800 dark:text-neutral-100">{acc.code}</td>
                            <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{acc.name}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  acc.type === "ASSET"
                                    ? "bg-blue-500/10 text-blue-500"
                                    : acc.type === "LIABILITY"
                                    ? "bg-red-500/10 text-red-500"
                                    : acc.type === "REVENUE"
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-amber-500/10 text-amber-500"
                                }`}
                              >
                                {acc.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] text-green-500 font-semibold">Active</span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Account Creation Form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Register Ledger Account
            </h3>

            <form onSubmit={handleCoaSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Account Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1001 or AP-3000"
                  value={coaCode}
                  onChange={(e) => setCoaCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Main A/c"
                  value={coaName}
                  onChange={(e) => setCoaName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Account Type
                </label>
                <select
                  value={coaType}
                  onChange={(e) => setCoaType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={creatingCoa}
                className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
              >
                {creatingCoa ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add Ledger Account
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "gl" && (
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search general ledger entries by COA account code, reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Posting Date</th>
                    <th className="p-3">COA Account Code</th>
                    <th className="p-3 text-right">Debit Amount</th>
                    <th className="p-3 text-right">Credit Amount</th>
                    <th className="p-3">Journal Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-neutral-400">
                        No transactions recorded in the General Ledger.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries
                      .filter(
                        (e: any) =>
                          e.coaCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.referenceId.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((e: any) => (
                        <tr key={e.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                          <td className="p-3 text-neutral-500">{new Date(e.ledgerDate).toLocaleDateString()}</td>
                          <td className="p-3 font-bold text-neutral-800 dark:text-neutral-100">{e.coaCode}</td>
                          <td className="p-3 text-right font-mono text-green-600 font-bold">
                            {e.debit > 0 ? `₹ ${e.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className="p-3 text-right font-mono text-red-500 font-bold">
                            {e.credit > 0 ? `₹ ${e.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                          </td>
                          <td className="p-3 font-mono text-[10px] text-neutral-400">{e.referenceType} ({e.referenceId.slice(-6)})</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "purchase" && (
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search purchase invoices by supplier code, project name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Invoice Date</th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Supplier Code</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Charge Project</th>
                    <th className="p-3 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-neutral-400">
                        No purchase invoices recorded.
                      </td>
                    </tr>
                  ) : (
                    purchaseInvoices
                      .filter(
                        (i: any) =>
                          i.supplierCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.projectName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((inv: any) => (
                        <tr key={inv.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                          <td className="p-3 text-neutral-500">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                          <td className="p-3 font-mono font-bold text-neutral-850 dark:text-neutral-100">{inv.invoiceNumber}</td>
                          <td className="p-3 font-bold text-neutral-700 dark:text-neutral-300">{inv.supplierCode}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                inv.status === "APPROVED" || inv.status === "MATCHED"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{inv.projectName}</td>
                          <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            ₹ {inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "sales" && (
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search sales invoices by bill number, project name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-border-custom bg-surface rounded-xl focus:outline-none focus:border-neutral-400"
            />
          </div>

          <div className="bg-surface border border-border-custom rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/30 border-b border-border-custom text-neutral-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Billing Date</th>
                    <th className="p-3">Bill Number</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Source Project</th>
                    <th className="p-3 text-right">Certified Claims Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {salesInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-neutral-400">
                        No certified sales billing claims found.
                      </td>
                    </tr>
                  ) : (
                    salesInvoices
                      .filter(
                        (b: any) =>
                          b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.projectName.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((b: any) => (
                        <tr key={b.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                          <td className="p-3 text-neutral-500">{new Date(b.invoiceDate).toLocaleDateString()}</td>
                          <td className="p-3 font-mono font-bold text-neutral-850 dark:text-neutral-100">{b.billNumber}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                b.status === "CERTIFIED" || b.status === "PAID"
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{b.projectName}</td>
                          <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            ₹ {b.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
