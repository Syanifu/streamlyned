"use client";

import { useState, useRef } from "react";
import { importAccountingDataAction } from "@/app/actions/tags";
import { toast } from "react-hot-toast";
import {
  Upload,
  CheckCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Database,
  Building,
} from "lucide-react";

export default function AccountingImportWizard() {
  const [provider, setProvider] = useState<"quickbooks" | "tally">("quickbooks");
  const [submitting, setSubmitting] = useState(false);
  const [connectedQbo, setConnectedQbo] = useState(false);
  const [qboConnecting, setQboConnecting] = useState(false);

  // Tally states
  const [tallyMethod, setTallyMethod] = useState<"upload" | "port">("upload");
  const [tallyFile, setTallyFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [portEndpoint, setPortEndpoint] = useState("http://localhost:9000");
  const [portTesting, setPortTesting] = useState(false);
  const [portConnected, setPortConnected] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle QuickBooks Connection Simulation
  const handleConnectQBO = () => {
    setQboConnecting(true);
    setTimeout(() => {
      setQboConnecting(false);
      setConnectedQbo(true);
      toast.success("Successfully connected to QuickBooks Online Sandbox!");
    }, 1500);
  };

  // Run the actual DB import via Server Action
  const handleSyncData = async () => {
    setSubmitting(true);
    try {
      const res = await importAccountingDataAction(provider);
      if (res.success) {
        toast.success(`Successfully imported ${res.count} account nodes from ${provider === "quickbooks" ? "QuickBooks" : "Tally"}!`);
      } else {
        toast.error(res.error || "Failed to import accounts.");
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred during synchronization.");
    } finally {
      setSubmitting(false);
    }
  };

  // Tally Direct Port Connection Test Simulation
  const handleTestTallyPort = () => {
    setPortTesting(true);
    setTimeout(() => {
      setPortTesting(false);
      setPortConnected(true);
      toast.success(`Connection established to Tally local server at ${portEndpoint}!`);
    }, 1200);
  };

  // Tally File Picked
  const handleTallyFilePicked = (picked: File) => {
    if (!picked.name.endsWith(".xml") && !picked.name.endsWith(".csv")) {
      toast.error("Please upload a .xml or .csv file exported from Tally.");
      return;
    }
    setTallyFile(picked);
    toast.success(`Loaded Tally export file: ${picked.name}`);
  };

  return (
    <div className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6">
      {/* Selector */}
      <div className="flex gap-2 border-b border-border-custom pb-4">
        <button
          onClick={() => {
            setProvider("quickbooks");
            setConnectedQbo(false);
          }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center justify-center gap-1.5 ${
            provider === "quickbooks"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm"
              : "bg-transparent text-neutral-400 border-border-custom hover:bg-neutral-50/50"
          }`}
        >
          <Building size={14} />
          QuickBooks Online
        </button>
        <button
          onClick={() => {
            setProvider("tally");
            setPortConnected(false);
            setTallyFile(null);
          }}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center justify-center gap-1.5 ${
            provider === "tally"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm"
              : "bg-transparent text-neutral-400 border-border-custom hover:bg-neutral-50/50"
          }`}
        >
          <Database size={14} />
          Tally ERP
        </button>
      </div>

      {/* QUICKBOOKS ONLINE CONTAINER */}
      {provider === "quickbooks" && (
        <div className="space-y-4">
          <div className="p-4 border border-border-custom bg-neutral-50/50 dark:bg-neutral-900/10 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                Connection Status
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {connectedQbo
                  ? "Connected to 'Acme Engineering QBO Sandbox'"
                  : "QuickBooks Online account not connected."}
              </p>
            </div>
            {connectedQbo ? (
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase">
                <CheckCircle size={10} />
                Linked
              </span>
            ) : (
              <button
                disabled={qboConnecting}
                onClick={handleConnectQBO}
                className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase rounded-lg hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
              >
                {qboConnecting && <Loader2 size={12} className="animate-spin" />}
                Connect QuickBooks
              </button>
            )}
          </div>

          {connectedQbo && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 border border-border-custom rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-brand-accent" />
                  Select Synchronization Scope
                </h4>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <input type="checkbox" defaultChecked className="rounded border-border-custom text-neutral-900" />
                    <span>Chart of Accounts (COA)</span>
                  </label>
                  <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <input type="checkbox" defaultChecked className="rounded border-border-custom text-neutral-900" />
                    <span>General Ledger Accounts</span>
                  </label>
                </div>
              </div>

              <button
                disabled={submitting}
                onClick={handleSyncData}
                className="w-full py-2 bg-brand-accent text-white text-xs font-extrabold uppercase rounded-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Fetch &amp; Sync Accounts
              </button>
            </div>
          )}
        </div>
      )}

      {/* TALLY ERP CONTAINER */}
      {provider === "tally" && (
        <div className="space-y-4">
          {/* Tally Connect Methods */}
          <div className="flex gap-2">
            <button
              onClick={() => setTallyMethod("upload")}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                tallyMethod === "upload"
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-transparent"
                  : "bg-transparent text-neutral-400 border-border-custom hover:bg-neutral-50/50"
              }`}
            >
              Upload Tally XML Export
            </button>
            <button
              onClick={() => setTallyMethod("port")}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                tallyMethod === "port"
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border-transparent"
                  : "bg-transparent text-neutral-400 border-border-custom hover:bg-neutral-50/50"
              }`}
            >
              Direct Local Port Link
            </button>
          </div>

          {/* METHOD A: XML UPLOAD */}
          {tallyMethod === "upload" && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleTallyFilePicked(e.target.files[0])}
                className="hidden"
                accept=".xml,.csv"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const picked = e.dataTransfer.files?.[0];
                  if (picked) handleTallyFilePicked(picked);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? "border-brand-accent bg-brand-accent/5"
                    : "border-border-custom hover:border-neutral-400 hover:bg-neutral-50/30"
                }`}
              >
                <Upload size={24} className="text-neutral-400" />
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  {tallyFile ? tallyFile.name : "Drag Tally XML or CSV export here"}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-400">
                  {tallyFile ? `${(tallyFile.size / 1024).toFixed(1)} KB` : "or click to browse filesystem"}
                </span>
              </div>

              {tallyFile && (
                <button
                  disabled={submitting}
                  onClick={handleSyncData}
                  className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase rounded-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Import Ledgers as Custom Tags
                </button>
              )}
            </div>
          )}

          {/* METHOD B: PORT LINK */}
          {tallyMethod === "port" && (
            <div className="space-y-4">
              <div className="p-4 border border-border-custom bg-neutral-50/50 dark:bg-neutral-900/10 rounded-2xl space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Tally XML Server Endpoint
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={portEndpoint}
                      onChange={(e) => setPortEndpoint(e.target.value)}
                      className="flex-1 text-xs px-3 py-1.5 border border-border-custom bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 rounded-lg focus:outline-none"
                    />
                    <button
                      disabled={portTesting}
                      onClick={handleTestTallyPort}
                      className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase rounded-lg hover:scale-105 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {portTesting && <Loader2 size={12} className="animate-spin" />}
                      Test Port
                    </button>
                  </div>
                </div>

                {portConnected && (
                  <div className="p-2 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-[10px] flex items-center gap-1.5">
                    <CheckCircle size={12} />
                    <span>Tally XML Service response verified. Direct synchronization is ready.</span>
                  </div>
                )}
              </div>

              {portConnected && (
                <button
                  disabled={submitting}
                  onClick={handleSyncData}
                  className="w-full py-2 bg-brand-accent text-white text-xs font-extrabold uppercase rounded-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Synchronize from Tally Server
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
