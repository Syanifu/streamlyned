"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteUserAction, changeUserRoleAction, removeWorkspaceMemberAction } from "@/app/actions/settings";
import { Settings, Users, UserPlus, ShieldAlert, Check, Trash2, Plug, BookOpen, Download } from "lucide-react";
import Link from "next/link";
import NotionImportModal from "@/components/notion-import-modal";
import { useBionicReading } from "@/hooks/use-bionic-reading";

interface MemberCompact {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface SettingsViewProps {
  members: MemberCompact[];
  currentUserId: string;
  currentUserRole: string;
  notionConnected: boolean;
  notionWorkspaceName: string | null;
}

export default function SettingsView({
  members = [],
  currentUserId,
  currentUserRole,
  notionConnected,
  notionWorkspaceName,
}: SettingsViewProps) {
  const router = useRouter();

  // Invite Form States
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Member Management States
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const isOwner = currentUserRole === "OWNER";
  const { enabled: bionicEnabled, toggle: toggleBionic } = useBionicReading();

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setLoadingMemberId(memberId);
    setMemberError(null);
    const res = await changeUserRoleAction(memberId, newRole);
    if (res.success) {
      router.refresh();
    } else {
      setMemberError(res.error || "Failed to change role");
    }
    setLoadingMemberId(null);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this workspace? This will also remove them from all projects.`)) return;
    setLoadingMemberId(memberId);
    setMemberError(null);
    const res = await removeWorkspaceMemberAction(memberId);
    if (res.success) {
      router.refresh();
    } else {
      setMemberError(res.error || "Failed to remove member");
    }
    setLoadingMemberId(null);
  };

  const handleInvite = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    const res = await inviteUserAction(inviteEmail, inviteName, inviteRole);
    if (res.success) {
      setInviteEmail("");
      setInviteName("");
      setInviteSuccess(true);
      router.refresh();
    } else {
      setInviteError(res.error || "Invitation failed");
    }
    setIsInviting(false);
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 border-b border-border-custom pb-4 shrink-0">
        <Settings size={20} className="text-neutral-400" />
        <div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
            Workspace Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage members and invitations for your workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Member Invitation */}
        <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <UserPlus size={16} className="text-neutral-600" />
            <h2 className="text-sm font-semibold">Invite Member</h2>
          </div>

          <form onSubmit={handleInvite} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Name
              </label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                disabled={isInviting}
                className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                required
                placeholder="email@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={isInviting}
                className="w-full text-xs px-3.5 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={isInviting}
                className="w-full text-xs px-3.5 py-2 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent"
              >
                <option value="MEMBER">Member (Full Access)</option>
                <option value="ADMIN">Admin (Settings Access)</option>
                <option value="CLIENT">Client (Project Scoped)</option>
              </select>
            </div>

            {inviteError && (
              <div className="text-[10px] bg-red-50 border border-red-100 text-red-600 dark:text-red-400 p-2 rounded-lg">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="text-[10px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 p-2 rounded-lg flex items-center gap-1.5">
                <Check size={11} />
                User added to workspace successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={isInviting || !inviteEmail || !inviteName}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2.5 disabled:opacity-50"
            >
              {isInviting ? "Adding..." : "Add to Workspace"}
            </button>
          </form>
        </div>

        {/* Members List */}
        <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
            <Users size={16} className="text-neutral-400" />
            <h2 className="text-sm font-semibold">Roster ({members.length})</h2>
          </div>

          {memberError && (
            <div className="text-[10px] bg-red-50 border border-red-100 text-red-600 dark:text-red-400 p-2 rounded-lg flex items-center gap-1.5">
              <ShieldAlert size={11} />
              {memberError}
            </div>
          )}

          <div className="divide-y divide-border-custom max-h-96 overflow-y-auto">
            {members.map((m) => {
              const isSelf = m.user.id === currentUserId;
              const isTargetOwner = m.role === "OWNER";
              const canManage = isOwner && !isSelf && !isTargetOwner;
              const isLoading = loadingMemberId === m.id;

              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={m.user.avatarUrl || ""}
                      alt={m.user.name}
                      className="w-6 h-6 rounded-full shrink-0"
                    />
                    <div className="min-w-0 flex flex-col">
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                        {m.user.name}
                        {isSelf && <span className="ml-1 text-[9px] text-neutral-400 font-normal">(you)</span>}
                      </span>
                      <span className="text-[9px] text-neutral-400 truncate">{m.user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {canManage ? (
                      <>
                        <select
                          value={m.role}
                          disabled={isLoading}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="text-[10px] px-1.5 py-1 border border-border-custom bg-surface rounded-md focus:outline-none focus:border-brand-accent disabled:opacity-50"
                        >
                          <option value="MEMBER">MEMBER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="CLIENT">CLIENT</option>
                        </select>
                        <button
                          disabled={isLoading}
                          onClick={() => handleRemoveMember(m.id, m.user.name)}
                          className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                          title="Remove from workspace"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono text-[9px] px-1.5 py-0.5 rounded">
                        {m.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reading Preferences */}
      <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
          <BookOpen size={16} className="text-neutral-400" />
          <h2 className="text-sm font-semibold">Reading Preferences</h2>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border-custom">
          <div>
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Bionic Reading</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Bold the first half of each word in documents to help your eye anchor faster while reading.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleBionic}
            role="switch"
            aria-checked={bionicEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              bionicEnabled ? "bg-neutral-900 dark:bg-white" : "bg-neutral-200 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white dark:bg-neutral-900 shadow-sm transform transition duration-200 ${
                bionicEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-surface border border-border-custom rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
          <Plug size={16} className="text-neutral-400" />
          <h2 className="text-sm font-semibold">Integrations</h2>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border-custom">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" fill="white"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Notion</p>
              <p className="text-[10px] text-neutral-400">Import pages as docs and databases as projects</p>
            </div>
          </div>
          <NotionImportModal isConnected={notionConnected} notionWorkspaceName={notionWorkspaceName} />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border-custom">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F0423F] rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">Basecamp</p>
              <p className="text-[10px] text-neutral-400">Import projects, tasks, messages, and docs</p>
            </div>
          </div>
          <Link
            href="/dashboard/import"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
          >
            <Download size={12} />
            Import
          </Link>
        </div>
      </div>
    </div>
  );
}
