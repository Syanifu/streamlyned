"use client";

import React, { useState } from "react";
import { switchUserAction, logoutAction } from "@/app/actions/auth";
import { Terminal, Users, RefreshCw, ChevronUp, ChevronDown, UserCheck } from "lucide-react";

interface DevBannerProps {
  currentEmail?: string;
  currentRole?: string;
  currentWorkspaceSlug?: string;
}

export default function DevBanner({
  currentEmail,
  currentRole,
  currentWorkspaceSlug = "acme-agency",
}: DevBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customSlug, setCustomSlug] = useState(currentWorkspaceSlug);
  const [error, setError] = useState<string | null>(null);

  const testUsers = [
    { name: "Olivia Owner", email: "owner@streamlyned.com", role: "OWNER" },
    { name: "Sarah SuperAdmin", email: "superadmin@streamlyned.com", role: "SUPER_ADMIN" },
    { name: "Alex Admin", email: "admin@streamlyned.com", role: "ADMIN" },
    { name: "Marcus Member", email: "member@streamlyned.com", role: "MEMBER" },
    { name: "Catherine Client", email: "client@streamlyned.com", role: "CLIENT" },
  ];

  const handleSwitch = async (email: string, slug: string) => {
    setIsPending(true);
    setError(null);
    try {
      const res = await switchUserAction(email, slug);
      if (!res.success) {
        setError(res.error || "Failed to switch user");
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white rounded-full text-xs shadow-lg hover:bg-neutral-800 transition-colors border border-neutral-800"
        >
          <Terminal size={14} className="text-neutral-400" />
          <span>Dev Options</span>
          {currentRole ? (
            <span className="bg-neutral-900 text-neutral-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
              {currentRole}
            </span>
          ) : (
            <span className="bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">
              OFFLINE
            </span>
          )}
          <ChevronUp size={12} />
        </button>
      )}

      {/* Main Panel */}
      {isOpen && (
        <div className="w-80 bg-white border border-neutral-200 rounded-lg shadow-xl p-4 text-neutral-800 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-3">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Terminal size={16} className="text-neutral-600" />
              <span>Developer Panel</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded hover:bg-neutral-50"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Current Status */}
          <div className="bg-neutral-50 border border-neutral-100 rounded p-2 mb-3 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-neutral-400">Workspace:</span>
              <span className="text-neutral-700 font-semibold">{currentWorkspaceSlug || "(none)"}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-neutral-400">User:</span>
              <span className="text-neutral-700 truncate max-w-[160px]">{currentEmail || "(none)"}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-neutral-400">Role:</span>
              <span className="text-neutral-700">
                {currentRole ? (
                  <span className="bg-neutral-100 text-neutral-800 px-1 rounded font-sans font-semibold text-[10px]">
                    {currentRole}
                  </span>
                ) : (
                  "guest"
                )}
              </span>
            </div>
          </div>

          {/* Switch Roles Title */}
          <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
            Switch Test Role (Acme Agency)
          </div>

          {/* Test Users List */}
          <div className="space-y-1.5 mb-4">
            {testUsers.map((u) => {
              const isActive = currentEmail === u.email;
              return (
                <button
                  key={u.email}
                  onClick={() => handleSwitch(u.email, "acme-agency")}
                  disabled={isPending || isActive}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                    isActive
                      ? "bg-neutral-50 border border-border-custom text-neutral-800 font-medium"
                      : "bg-neutral-50 hover:bg-neutral-100 border border-transparent text-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users size={12} className={isActive ? "text-neutral-600" : "text-neutral-400"} />
                    <span className="truncate max-w-[120px]">{u.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{u.role}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Switch Form */}
          <div className="border-t border-neutral-100 pt-3">
            <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
              Custom Login
            </div>
            <div className="space-y-2">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded focus:outline-none focus:border-neutral-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Workspace slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  className="w-1/2 text-xs px-2.5 py-1.5 border border-neutral-200 rounded focus:outline-none focus:border-neutral-500"
                />
                <button
                  onClick={() => handleSwitch(customEmail, customSlug)}
                  disabled={isPending || !customEmail || !customSlug}
                  className="w-1/2 flex items-center justify-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium py-1.5 disabled:opacity-50 transition-colors"
                >
                  {isPending ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <UserCheck size={12} />
                  )}
                  <span>Switch</span>
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-100 text-red-700 text-[11px] p-2 rounded">
              {error}
            </div>
          )}

          {currentEmail && (
            <button
              onClick={async () => {
                await logoutAction();
                window.location.reload();
              }}
              className="mt-4 w-full text-center text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Clear Current Session (Log Out)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
