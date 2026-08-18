"use client";

import React, { useState, useEffect } from "react";
import { getMasterInventoryData, createItemMasterAction, createSupplierMasterAction } from "@/app/actions/master";
import { Database, Plus, Search, Tag, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function MasterInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"stock" | "ledger" | "suppliers">("stock");

  // Form states
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemUom, setItemUom] = useState("PCS");
  const [itemGroup, setItemGroup] = useState("RAW_MATERIAL");
  const [itemReorder, setItemReorder] = useState(50);
  const [creatingItem, setCreatingItem] = useState(false);

  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierGstin, setSupplierGstin] = useState("");
  const [supplierLimit, setSupplierLimit] = useState(500000);
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getMasterInventoryData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to fetch master inventory.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode || !itemName) {
      toast.error("Please fill in item details.");
      return;
    }
    setCreatingItem(true);
    const res = await createItemMasterAction(itemCode, itemName, itemUom, itemGroup, itemReorder);
    if (res.success) {
      toast.success("Item Master registered successfully!");
      setItemCode("");
      setItemName("");
      loadData();
    } else {
      toast.error(res.error || "Failed to register item.");
    }
    setCreatingItem(false);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierCode || !supplierName || !supplierGstin) {
      toast.error("Please fill in supplier details.");
      return;
    }
    setCreatingSupplier(true);
    const res = await createSupplierMasterAction(supplierCode, supplierName, supplierGstin, supplierLimit);
    if (res.success) {
      toast.success("Supplier registered successfully!");
      setSupplierCode("");
      setSupplierName("");
      setSupplierGstin("");
      loadData();
    } else {
      toast.error(res.error || "Failed to register supplier.");
    }
    setCreatingSupplier(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const itemsList = data?.items || [];
  const movements = data?.movements || [];
  const suppliers = data?.suppliers || [];
  const summary = data?.summary || { totalItems: 0, totalValuation: 0, reorderBreachesCount: 0 };

  const filteredItems = itemsList.filter(
    (i: any) =>
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMovements = movements.filter(
    (m: any) =>
      m.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="border-b border-border-custom pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-brand-accent" />
            Master Inventory
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Workspace-wide warehouse balances, stock ledger movements, and supplier registries.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Items Registered</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            {summary.totalItems}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Warehouse Stock Valuation</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            ₹ {summary.totalValuation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Reorder Level Breaches</span>
          <div className="text-2xl font-black text-red-500 mt-1 flex items-center gap-2">
            {summary.reorderBreachesCount}
            {summary.reorderBreachesCount > 0 && <AlertTriangle size={18} className="animate-pulse" />}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-border-custom flex gap-1">
        <button
          onClick={() => {
            setActiveTab("stock");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "stock"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Stock Balance
        </button>
        <button
          onClick={() => {
            setActiveTab("ledger");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "ledger"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Stock Ledger
        </button>
        <button
          onClick={() => {
            setActiveTab("suppliers");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "suppliers"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Suppliers Directory
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === "stock" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Stock Balances list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search stock balances by code or name..."
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
                      <th className="p-3">Item Details</th>
                      <th className="p-3">UOM</th>
                      <th className="p-3 text-right">On Hand Qty</th>
                      <th className="p-3 text-right">MAC Rate</th>
                      <th className="p-3 text-right">Inventory Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          No stock balances found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item: any) => (
                        <tr key={item.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                          <td className="p-3">
                            <div className="font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                              {item.code}
                              {item.breached && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-red-500/10 text-red-500 text-[8px] font-extrabold uppercase">
                                  Low Stock
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">{item.name} • {item.group}</div>
                          </td>
                          <td className="p-3 font-mono">{item.uom}</td>
                          <td className={`p-3 text-right font-mono font-bold ${item.breached ? "text-red-500" : ""}`}>
                            {item.onHand.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono">
                            ₹ {item.macRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                            ₹ {item.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Item Creation Form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Register Item Master
            </h3>

            <form onSubmit={handleItemSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CEMENT-53G"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OPC 53 Grade Cement"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    UOM
                  </label>
                  <select
                    value={itemUom}
                    onChange={(e) => setItemUom(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="MT">MT</option>
                    <option value="M">M</option>
                    <option value="BAGS">BAGS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Item Group
                  </label>
                  <select
                    value={itemGroup}
                    onChange={(e) => setItemGroup(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="SERVICES">Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Reorder Level Warning
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={itemReorder}
                  onChange={(e) => setItemReorder(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingItem}
                className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
              >
                {creatingItem ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add Item Master
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search stock ledger by item code, project name..."
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
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">MAC Rate</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Charge Project</th>
                    <th className="p-3">Warehouse</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-neutral-400">
                        No ledger movements recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m: any) => (
                      <tr key={m.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                        <td className="p-3 font-bold text-neutral-800 dark:text-neutral-100">{m.itemCode}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              m.type === "GRN"
                                ? "bg-green-500/10 text-green-500"
                                : m.type === "ISSUE"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-purple-500/10 text-purple-500"
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${m.quantity < 0 ? "text-red-500" : "text-green-500"}`}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td className="p-3 text-right font-mono">
                          ₹ {m.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-neutral-400">{m.referenceType} ({m.referenceId.slice(-6)})</td>
                        <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{m.projectName}</td>
                        <td className="p-3 font-mono text-neutral-400">{m.warehouse}</td>
                        <td className="p-3 text-neutral-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "suppliers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Supplier Directory */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search suppliers directory by code or name..."
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
                      <th className="p-3">Supplier Code</th>
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3">GSTIN</th>
                      <th className="p-3 text-right">Credit Limit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-neutral-400">
                          No suppliers registered.
                        </td>
                      </tr>
                    ) : (
                      suppliers
                        .filter(
                          (s: any) =>
                            s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.name.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((sup: any) => (
                          <tr key={sup.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                            <td className="p-3 font-bold text-neutral-800 dark:text-neutral-100">{sup.code}</td>
                            <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{sup.name}</td>
                            <td className="p-3 font-mono">{sup.gstin || "N/A"}</td>
                            <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                              ₹ {sup.creditLimit.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Supplier registration form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Register Supplier Master
            </h3>

            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Supplier Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STEEL-MART"
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Supplier Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steel Mart India Pvt Ltd"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Credit Limit (INR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={supplierLimit}
                  onChange={(e) => setSupplierLimit(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingSupplier}
                className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
              >
                {creatingSupplier ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add Supplier Master
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
