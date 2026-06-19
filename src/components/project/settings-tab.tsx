"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus, UserMinus, Save, Archive, ArchiveRestore, AlertTriangle, Zap } from "lucide-react";
import {
  updateProjectAction,
  updateProjectToolsAction,
  archiveProjectAction,
  deleteProjectAction,
  addProjectMemberAction,
  removeProjectMemberAction,
  updateMemberVisibleToolsAction,
  toggleProjectAgenticAction,
} from "@/app/actions/project";

const ALL_TOOLS = ["tasks", "discussions", "chat", "docs", "calendar"] as const;
type Tool = (typeof ALL_TOOLS)[number];

const TOOL_LABELS: Record<Tool, string> = {
  tasks: "Tasks",
  discussions: "Discussions",
  chat: "Chat",
  docs: "Docs",
  calendar: "Calendar",
};

interface ProjectMemberEntry {
  id: string;
  userId: string;
  visibleTools: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface WorkspaceUserEntry {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ProjectSettingsTabProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  startDate: string | null;
  endDate: string | null;
  enabledTools: string[];
  isArchived: boolean;
  agenticEnabled: boolean;
  members: ProjectMemberEntry[];
  workspaceUsers: WorkspaceUserEntry[];
  currentUserId: string;
  currentUserRole: string;
}

export default function ProjectSettingsTab({
  projectId,
  projectName,
  projectDescription,
  startDate,
  endDate,
  enabledTools,
  isArchived,
  agenticEnabled,
  members,
  workspaceUsers,
  currentUserId,
  currentUserRole,
}: ProjectSettingsTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Agentic toggle
  const [agenticOn, setAgenticOn] = useState(agenticEnabled);
  const [isTogglingAgentic, setIsTogglingAgentic] = useState(false);

  async function handleToggleAgentic() {
    if (isTogglingAgentic) return;
    setIsTogglingAgentic(true);
    const next = !agenticOn;
    setAgenticOn(next);
    const res = await toggleProjectAgenticAction(projectId, next);
    if (!res.success) setAgenticOn(!next);
    setIsTogglingAgentic(false);
  }

  // General section
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription ?? "");
  const [start, setStart] = useState(startDate ? startDate.slice(0, 10) : "");
  const [end, setEnd] = useState(endDate ? endDate.slice(0, 10) : "");
  const [generalMsg, setGeneralMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tools section
  const [selectedTools, setSelectedTools] = useState<Set<Tool>>(
    new Set(enabledTools.filter((t): t is Tool => ALL_TOOLS.includes(t as Tool)))
  );
  const [toolsMsg, setToolsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Members section
  const [addUserId, setAddUserId] = useState("");
  const [membersMsg, setMembersMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  // Danger zone
  const [dangerMsg, setDangerMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isOwner = currentUserRole === "OWNER";
  const isAdmin = currentUserRole === "ADMIN";
  const canManage = isOwner || isAdmin;

  const notYetMembers = workspaceUsers.filter(
    (u) => !members.some((m) => m.userId === u.id)
  );

  function handleSaveGeneral() {
    setGeneralMsg(null);
    startTransition(async () => {
      const res = await updateProjectAction(projectId, {
        name,
        description,
        startDate: start || null,
        endDate: end || null,
      });
      setGeneralMsg(res.success ? { type: "success", text: "Project details saved." } : { type: "error", text: res.error ?? "Failed to save." });
    });
  }

  function handleSaveTools() {
    setToolsMsg(null);
    startTransition(async () => {
      const res = await updateProjectToolsAction(projectId, Array.from(selectedTools));
      setToolsMsg(res.success ? { type: "success", text: "Tools updated." } : { type: "error", text: res.error ?? "Failed to update." });
    });
  }

  function handleAddMember() {
    if (!addUserId) return;
    setMembersMsg(null);
    startTransition(async () => {
      const res = await addProjectMemberAction(projectId, addUserId);
      if (res.success) {
        setAddUserId("");
        setMembersMsg({ type: "success", text: "Member added." });
        router.refresh();
      } else {
        setMembersMsg({ type: "error", text: res.error ?? "Failed to add member." });
      }
    });
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove "${memberName}" from this project?`)) return;
    setMembersMsg(null);
    setLoadingMemberId(memberId);
    const res = await removeProjectMemberAction(projectId, memberId);
    setLoadingMemberId(null);
    if (res.success) {
      setMembersMsg({ type: "success", text: `"${memberName}" removed.` });
      router.refresh();
    } else {
      setMembersMsg({ type: "error", text: res.error ?? "Failed to remove." });
    }
  }

  async function handleVisibleToolsChange(memberId: string, tool: Tool, checked: boolean) {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const current = new Set(JSON.parse(member.visibleTools) as Tool[]);
    if (checked) current.add(tool); else current.delete(tool);
    setLoadingMemberId(memberId);
    const res = await updateMemberVisibleToolsAction(projectId, memberId, Array.from(current));
    setLoadingMemberId(null);
    if (res.success) router.refresh();
    else setMembersMsg({ type: "error", text: res.error ?? "Failed to update visible tools." });
  }

  function handleArchive() {
    const msg = isArchived ? "Unarchive this project?" : "Archive this project? Members will still be able to view it.";
    if (!confirm(msg)) return;
    setDangerMsg(null);
    startTransition(async () => {
      const res = await archiveProjectAction(projectId, !isArchived);
      if (res.success) {
        setDangerMsg({ type: "success", text: isArchived ? "Project unarchived." : "Project archived." });
        router.refresh();
      } else {
        setDangerMsg({ type: "error", text: res.error ?? "Failed." });
      }
    });
  }

  function handleDelete() {
    if (!confirm("Permanently delete this project? This cannot be undone.")) return;
    if (!confirm("Are you sure? All tasks, docs, and data will be lost.")) return;
    setDangerMsg(null);
    startTransition(async () => {
      const res = await deleteProjectAction(projectId);
      if (res.success) {
        router.push("/dashboard");
      } else {
        setDangerMsg({ type: "error", text: res.error ?? "Failed to delete." });
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-8 pb-16">

      {/* General */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">
          General
        </h2>
        <div className="bg-surface border border-border-custom rounded-lg p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              className="w-full text-sm bg-background border border-border-custom rounded-md px-3 py-2 text-foreground placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canManage}
              className="w-full text-sm bg-background border border-border-custom rounded-md px-3 py-2 text-foreground placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">Start Date</label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                disabled={!canManage}
                className="w-full text-sm bg-background border border-border-custom rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500">End Date</label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                disabled={!canManage}
                className="w-full text-sm bg-background border border-border-custom rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>
          </div>
          {/* Agentic Features toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-indigo-500" />
              <span className="text-sm text-foreground">Agentic Features</span>
              <span className="text-xs text-neutral-400">— AI-powered meeting notes parsing</span>
            </div>
            <button
              onClick={handleToggleAgentic}
              disabled={!canManage || isTogglingAgentic}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 disabled:opacity-50 ${
                agenticOn ? "bg-indigo-600" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 bg-white rounded-full shadow absolute transition-all ${
                  agenticOn ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {generalMsg && (
            <p className={`text-xs ${generalMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {generalMsg.text}
            </p>
          )}
          {canManage && (
            <button
              onClick={handleSaveGeneral}
              disabled={isPending}
              className="flex items-center gap-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              Save Changes
            </button>
          )}
        </div>
      </section>

      {/* Tools */}
      {canManage && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">
            Enabled Tabs
          </h2>
          <div className="bg-surface border border-border-custom rounded-lg p-5 space-y-4">
            <p className="text-xs text-neutral-400">Choose which tabs are visible for this project.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_TOOLS.map((tool) => (
                <label key={tool} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedTools.has(tool)}
                    onChange={(e) => {
                      const next = new Set(selectedTools);
                      if (e.target.checked) next.add(tool); else next.delete(tool);
                      setSelectedTools(next);
                    }}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-foreground">{TOOL_LABELS[tool]}</span>
                </label>
              ))}
            </div>
            {toolsMsg && (
              <p className={`text-xs ${toolsMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {toolsMsg.text}
              </p>
            )}
            <button
              onClick={handleSaveTools}
              disabled={isPending}
              className="flex items-center gap-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              Save Tabs
            </button>
          </div>
        </section>
      )}

      {/* Members */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">
          Members
        </h2>
        <div className="bg-surface border border-border-custom rounded-lg p-5 space-y-4">
          {membersMsg && (
            <p className={`text-xs ${membersMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
              {membersMsg.text}
            </p>
          )}

          {/* Add member */}
          {canManage && notYetMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                className="flex-1 text-sm bg-background border border-border-custom rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a workspace member to add…</option>
                {notYetMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addUserId || isPending}
                className="flex items-center gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50 shrink-0"
              >
                <UserPlus size={13} />
                Add
              </button>
            </div>
          )}

          {/* Member list */}
          <div className="divide-y divide-border-custom">
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const canRemove = canManage && !isSelf;
              const memberTools = JSON.parse(member.visibleTools) as string[];

              return (
                <div key={member.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {member.user.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt="" className="w-7 h-7 rounded-full shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.user.name}{isSelf && <span className="text-neutral-400 font-normal ml-1">(you)</span>}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">{member.user.email}</p>
                      </div>
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.user.name)}
                        disabled={loadingMemberId === member.id}
                        className="shrink-0 p-1.5 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        title="Remove from project"
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>

                  {/* Visible tools for this member (client-facing view control) */}
                  {canManage && (
                    <div className="pl-9">
                      <p className="text-[11px] text-neutral-400 mb-1.5">Visible tabs for this member:</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        {ALL_TOOLS.map((tool) => (
                          <label key={tool} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={memberTools.includes(tool)}
                              onChange={(e) => handleVisibleToolsChange(member.id, tool, e.target.checked)}
                              disabled={loadingMemberId === member.id}
                              className="accent-indigo-600"
                            />
                            <span className="text-xs text-neutral-500">{TOOL_LABELS[tool]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      {canManage && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide flex items-center gap-2">
            <AlertTriangle size={14} />
            Danger Zone
          </h2>
          <div className="bg-surface border border-red-200 dark:border-red-800 rounded-lg p-5 space-y-4">
            {dangerMsg && (
              <p className={`text-xs ${dangerMsg.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {dangerMsg.text}
              </p>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isArchived ? "Unarchive Project" : "Archive Project"}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isArchived
                    ? "Restore this project to active status."
                    : "Mark this project as archived. It stays visible but read-only."}
                </p>
              </div>
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs font-medium border border-border-custom hover:border-neutral-400 px-3 py-2 rounded-md transition-colors text-foreground disabled:opacity-50 shrink-0 ml-4"
              >
                {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                {isArchived ? "Unarchive" : "Archive"}
              </button>
            </div>

            {isOwner && (
              <div className="flex items-center justify-between pt-4 border-t border-red-100 dark:border-red-900/40">
                <div>
                  <p className="text-sm font-medium text-red-600">Delete Project</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Permanently delete this project and all its data. This cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex items-center gap-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50 shrink-0 ml-4"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
