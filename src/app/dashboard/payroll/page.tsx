"use client";

import React, { useState, useEffect } from "react";
import { getMasterPayrollData, onboardEmployeeAction, runMonthlyPayrollAction } from "@/app/actions/master";
import { User, Plus, Search, Play, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export default function MasterPayrollPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"directory" | "slips">("directory");

  // Form states
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDesignation, setEmpDesignation] = useState("Project Engineer");
  const [empRate, setEmpRate] = useState(450);
  const [creatingEmp, setCreatingEmp] = useState(false);

  const [payrollMonth, setPayrollMonth] = useState("2026-08");
  const [runningPayroll, setRunningPayroll] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    const res = await getMasterPayrollData();
    if (res.success) {
      setData(res);
    } else {
      toast.error(res.error || "Failed to fetch master payroll.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEmpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empEmail) {
      toast.error("Please fill in employee details.");
      return;
    }
    setCreatingEmp(true);
    const res = await onboardEmployeeAction(empName, empEmail, empDesignation, empRate);
    if (res.success) {
      toast.success("Employee onboarded successfully in company directory!");
      setEmpName("");
      setEmpEmail("");
      loadData();
    } else {
      toast.error(res.error || "Failed to onboard employee.");
    }
    setCreatingEmp(false);
  };

  const handleRunPayroll = async () => {
    setRunningPayroll(true);
    const res = await runMonthlyPayrollAction(payrollMonth);
    if (res.success) {
      toast.success(`Payroll salary run completed successfully! Generated payslips.`);
      loadData();
    } else {
      toast.error(res.error || "Failed to execute payroll run.");
    }
    setRunningPayroll(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const employees = data?.employees || [];
  const salarySlips = data?.salarySlips || [];
  const summary = data?.summary || { totalEmployees: 0, totalPayrollExpense: 0, totalStatutoryDeductions: 0 };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="border-b border-border-custom pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <User size={20} className="text-brand-accent" />
            Master HR &amp; Payroll
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Employee registers, cost codes allocation rates, statutory PF/ESI deductions, and salary slips run logs.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Active Employees</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            {summary.totalEmployees}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Payroll Outflow</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            ₹ {summary.totalPayrollExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-surface border border-border-custom rounded-2xl p-4">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Statutory Deductions (PF/ESI)</span>
          <div className="text-2xl font-black text-neutral-800 dark:text-white mt-1">
            ₹ {summary.totalStatutoryDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-border-custom flex gap-1">
        <button
          onClick={() => {
            setActiveTab("directory");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "directory"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Employee Directory
        </button>
        <button
          onClick={() => {
            setActiveTab("slips");
            setSearchQuery("");
          }}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "slips"
              ? "border-neutral-900 text-neutral-900 dark:border-white dark:text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Salary Slips Run
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Employee Directory */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search employee register by name, email..."
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
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3 text-right">Labour Cost Rate</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          Employee directory is empty. Onboard your first staff member.
                        </td>
                      </tr>
                    ) : (
                      employees
                        .filter(
                          (e: any) =>
                            e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            e.email.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((emp: any) => (
                          <tr key={emp.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                            <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{emp.name}</td>
                            <td className="p-3 font-mono text-neutral-500">{emp.email}</td>
                            <td className="p-3 font-semibold text-neutral-700 dark:text-neutral-300">{emp.designation}</td>
                            <td className="p-3 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                              ₹ {emp.costRatePerHour.toLocaleString("en-IN")}/hr
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

          {/* Employee Onboarding Form */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Plus size={14} className="text-brand-accent" />
              Onboard Employee
            </h3>

            <form onSubmit={handleEmpSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@streamlyned.com"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Designation
                </label>
                <select
                  value={empDesignation}
                  onChange={(e) => setEmpDesignation(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent dark:bg-neutral-900 rounded-lg focus:outline-none"
                >
                  <option value="Project Engineer">Project Engineer</option>
                  <option value="Site Supervisor">Site Supervisor</option>
                  <option value="Planning Manager">Planning Manager</option>
                  <option value="QAQC Inspector">QA/QC Inspector</option>
                  <option value="General Mason">General Mason</option>
                  <option value="Structural Welder">Structural Welder</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Cost Rate Per Hour (INR)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={empRate}
                  onChange={(e) => setEmpRate(parseInt(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingEmp}
                className="w-full py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
              >
                {creatingEmp ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Onboard Employee
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "slips" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Salary Slips table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search salary slips by employee name, month..."
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
                      <th className="p-3">Month</th>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3 text-right">Basic Salary</th>
                      <th className="p-3 text-right">PF/ESI Deductions</th>
                      <th className="p-3 text-right">Net Payout</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salarySlips.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-400">
                          No payroll run logs committed.
                        </td>
                      </tr>
                    ) : (
                      salarySlips
                        .filter(
                          (s: any) =>
                            s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.month.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((s: any) => (
                          <tr key={s.id} className="border-b border-border-custom hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20">
                            <td className="p-3 font-mono font-bold text-neutral-850 dark:text-neutral-100">{s.month}</td>
                            <td className="p-3">
                              <div className="font-bold text-neutral-750 dark:text-neutral-200">{s.employeeName}</div>
                              <div className="text-[10px] text-neutral-400 mt-0.5">{s.designation}</div>
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹ {s.basicSalary.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono text-red-500 font-bold">
                              ₹ {s.statutoryDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-mono text-green-600 font-bold">
                              ₹ {s.netPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-500 uppercase">
                                {s.status}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Execute Payroll Run Panel */}
          <div className="bg-surface border border-border-custom rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Play size={14} className="text-purple-500" />
              Execute Monthly Payroll
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Payroll Period (Month)
                </label>
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none"
                />
              </div>

              <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-1">
                <span className="font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wide text-[8px]">
                  Statutory Deductions Notice
                </span>
                <p className="text-[9px] leading-normal font-medium text-neutral-600 dark:text-neutral-400">
                  Running payroll will automatically apportion labour costs based on default basic salaries of active staff, apply 12% statutory PF/ESI tax deductions, and commit double-entry ledger postings to Accounts.
                </p>
              </div>

              <button
                onClick={handleRunPayroll}
                disabled={runningPayroll}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-1"
              >
                {runningPayroll ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
