"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createStructuredCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
  parseMeetingNotesAction,
  type ParsedEventDraft,
} from "@/app/actions/calendar";
import {
  Calendar as CalendarIcon,
  Filter,
  Check,
  Copy,
  Plus,
  Pencil,
  Trash2,
  X,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ProjectInfo {
  id: string;
  name: string;
}

interface CalendarEventCompact {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  recurrence: string | null;
  location: string | null;
  videoCallLink: string | null;
  projectId: string;
  priority: string;
  source?: string | null;
  sourceRef?: string | null;
  progressPct?: number | null;
}

interface TaskDueCompact {
  id: string;
  title: string;
  dueDateEnd: string;
  projectId: string;
  priority: string;
}

const PRIORITIES = [
  { value: "P1", label: "🔴 P1 — Critical" },
  { value: "P2", label: "🟠 P2 — High" },
  { value: "P3", label: "🟡 P3 — Medium" },
  { value: "P4", label: "🟢 P4 — Normal" },
  { value: "P5", label: "🔵 P5 — Low" },
  { value: "P6", label: "⚪ P6 — Archived" },
];

const getEventStyles = (priority: string) => {
  const map: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    P1: { bg: "bg-red-500", text: "text-[#111111]", border: "border-red-600", dot: "bg-red-700" },
    P2: { bg: "bg-orange-500", text: "text-[#111111]", border: "border-orange-600", dot: "bg-orange-700" },
    P3: { bg: "bg-yellow-400", text: "text-[#111111]", border: "border-yellow-500", dot: "bg-yellow-600" },
    P4: { bg: "bg-green-500", text: "text-[#111111]", border: "border-green-600", dot: "bg-green-700" },
    P5: { bg: "bg-blue-500", text: "text-[#111111]", border: "border-blue-600", dot: "bg-blue-700" },
    P6: { bg: "bg-neutral-400", text: "text-[#111111]", border: "border-neutral-500", dot: "bg-neutral-600" },
  };
  return map[priority] || map.P4;
};

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toTimeStr = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface GlobalCalendarViewProps {
  projects: ProjectInfo[];
  events: CalendarEventCompact[];
  tasks: TaskDueCompact[];
  currentUserId: string;
  workspaceSlug: string;
}

type SidebarMode = "idle" | "create" | "edit" | "meeting-notes";

interface EventForm {
  projectId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  videoCallLink: string;
  priority: string;
}

const emptyForm = (projectId: string, date = ""): EventForm => ({
  projectId,
  title: "",
  date,
  startTime: "09:00",
  endTime: "10:00",
  description: "",
  location: "",
  videoCallLink: "",
  priority: "P4",
});

export default function GlobalCalendarView({
  projects,
  events,
  tasks,
  currentUserId,
  workspaceSlug,
}: GlobalCalendarViewProps) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Sidebar state
  const [mode, setMode] = useState<SidebarMode>("idle");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm(projects[0]?.id || ""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Meeting notes parser state
  const [meetingNotes, setMeetingNotes] = useState("");
  const [meetingNotesProjectId, setMeetingNotesProjectId] = useState(projects[0]?.id || "");
  const [isParsing, setIsParsing] = useState(false);
  const [parsedDrafts, setParsedDrafts] = useState<ParsedEventDraft[]>([]);
  const [draftErrors, setDraftErrors] = useState<string | null>(null);
  const [isCreatingAll, setIsCreatingAll] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null);

  // iCal
  const [isCopied, setIsCopied] = useState(false);

  const getIcalUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/ical/${workspaceSlug}/${currentUserId}`;
  };

  const handleCopyIcal = () => {
    navigator.clipboard.writeText(getIcalUrl());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const openMeetingNotes = () => {
    setMeetingNotes("");
    setMeetingNotesProjectId(projects[0]?.id || "");
    setParsedDrafts([]);
    setDraftErrors(null);
    setExpandedDraft(null);
    setMode("meeting-notes");
  };

  const handleParseNotes = async () => {
    if (!meetingNotes.trim() || !meetingNotesProjectId) return;
    setIsParsing(true);
    setDraftErrors(null);
    setParsedDrafts([]);
    const res = await parseMeetingNotesAction(meetingNotesProjectId, meetingNotes);
    setIsParsing(false);
    if (res.success) {
      setParsedDrafts(res.events);
    } else {
      setDraftErrors(res.error);
    }
  };

  const handleCreateAllDrafts = async () => {
    if (!parsedDrafts.length) return;
    setIsCreatingAll(true);
    let failed = 0;
    for (const draft of parsedDrafts) {
      const res = await createStructuredCalendarEventAction(meetingNotesProjectId, draft);
      if (!res.success) failed++;
    }
    setIsCreatingAll(false);
    if (failed === 0) {
      setMode("idle");
      setParsedDrafts([]);
      setMeetingNotes("");
      router.refresh();
    } else {
      setDraftErrors(`${failed} event(s) failed to create.`);
    }
  };

  const updateDraft = (idx: number, key: keyof ParsedEventDraft, value: string) => {
    setParsedDrafts((prev) => prev.map((d, i) => i === idx ? { ...d, [key]: value } : d));
  };

  const removeDraft = (idx: number) => {
    setParsedDrafts((prev) => prev.filter((_, i) => i !== idx));
  };

  // Open create form, optionally pre-filling a date
  const openCreate = (date?: Date) => {
    setForm(emptyForm(projects[0]?.id || "", date ? toDateStr(date) : ""));
    setEditingEventId(null);
    setMode("create");
  };

  // Open edit form from an existing event
  const openEdit = (ev: CalendarEventCompact) => {
    setForm({
      projectId: ev.projectId,
      title: ev.title,
      date: toDateStr(new Date(ev.startAt)),
      startTime: toTimeStr(ev.startAt),
      endTime: toTimeStr(ev.endAt),
      description: ev.description || "",
      location: ev.location || "",
      videoCallLink: ev.videoCallLink || "",
      priority: ev.priority || "P4",
    });
    setEditingEventId(ev.id);
    setMode("edit");
  };

  const setField = (key: keyof EventForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmitCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.projectId) return;
    setIsSubmitting(true);
    const res = await createStructuredCalendarEventAction(form.projectId, {
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      description: form.description,
      location: form.location,
      videoCallLink: form.videoCallLink,
      priority: form.priority,
    });
    setIsSubmitting(false);
    if (res.success) {
      setMode("idle");
      router.refresh();
    } else {
      alert(res.error || "Failed to create event");
    }
  };

  const handleSubmitEdit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!editingEventId || !form.title.trim() || !form.date) return;
    setIsSubmitting(true);
    const res = await updateCalendarEventAction(editingEventId, {
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      description: form.description,
      location: form.location,
      videoCallLink: form.videoCallLink,
      priority: form.priority,
    });
    setIsSubmitting(false);
    if (res.success) {
      setMode("idle");
      setEditingEventId(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (!editingEventId || !confirm("Delete this event?")) return;
    setIsDeleting(true);
    const res = await deleteCalendarEventAction(editingEventId);
    setIsDeleting(false);
    if (res.success) {
      setMode("idle");
      setEditingEventId(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to delete event");
    }
  };

  // Filter items by project
  const filteredEvents = selectedProjectId === "all"
    ? events
    : events.filter((e) => e.projectId === selectedProjectId);

  const filteredTasks = selectedProjectId === "all"
    ? tasks
    : tasks.filter((t) => t.projectId === selectedProjectId);

  // Generate 5-week grid starting from Monday of current week
  const getCalendarDays = () => {
    const days: Date[] = [];
    const now = new Date();
    const dow = now.getDay();
    const distToMonday = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distToMonday);
    monday.setHours(0, 0, 0, 0);
    for (let i = 0; i < 35; i++) {
      days.push(new Date(monday.getTime() + i * 86400000));
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const weekdaysLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getProjectName = (pId: string) =>
    projects.find((p) => p.id === pId)?.name || "Unknown Project";

  // Shared form fields UI (used for both create and edit)
  const renderFormFields = () => (
    <div className="space-y-3">
      {mode === "create" && (
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => setField("projectId", e.target.value)}
            required
            className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Title</label>
        <input
          required
          type="text"
          placeholder="Event title"
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Date</label>
        <input
          required
          type="date"
          value={form.date}
          onChange={(e) => setField("date", e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Start</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setField("startTime", e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">End</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setField("endTime", e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Priority</label>
        <select
          value={form.priority}
          onChange={(e) => setField("priority", e.target.value)}
          className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Location (optional)</label>
        <input
          type="text"
          placeholder="e.g. Office or Zoom"
          value={form.location}
          onChange={(e) => setField("location", e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Video Link (optional)</label>
        <input
          type="text"
          placeholder="https://zoom.us/..."
          value={form.videoCallLink}
          onChange={(e) => setField("videoCallLink", e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Description (optional)</label>
        <textarea
          placeholder="Add a description..."
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={2}
          className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400 resize-none"
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Filters Bar */}
      <div className="flex items-center justify-between gap-4 shrink-0 bg-surface border border-border-custom px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Filter size={14} className="text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Filter by Project</span>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => { setSelectedProjectId(e.target.value); setMode("idle"); }}
            className="text-xs bg-surface border border-border-custom rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-200"
          >
            <option value="all">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyIcal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 rounded-lg text-[10px] font-semibold transition-colors"
            title="Copy iCal URL"
          >
            {isCopied ? <Check size={11} className="text-neutral-600" /> : <Copy size={11} />}
            <span>{isCopied ? "iCal URL Copied" : "iCal Feed"}</span>
          </button>
          <button
            onClick={openMeetingNotes}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 rounded-lg text-[10px] font-semibold transition-colors"
          >
            <FileText size={11} />
            <span>Meeting Notes</span>
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium"
          >
            <Plus size={13} />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 flex flex-col bg-surface border border-border-custom rounded-xl p-4 overflow-hidden h-[500px]">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 border-b border-border-custom pb-2 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            {weekdaysLabels.map((lbl) => <div key={lbl}>{lbl}</div>)}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 mt-1 overflow-y-auto">
            {calendarDays.map((day, idx) => {
              const dayStr = day.toDateString();
              const isToday = new Date().toDateString() === dayStr;
              const isSelected =
                mode !== "idle" &&
                form.date === toDateStr(day);

              const dayEvents = filteredEvents.filter(
                (e) => new Date(e.startAt).toDateString() === dayStr
              );
              const progressEvents = dayEvents.filter((e) => e.source === "agent_progress");
              const regularEvents = dayEvents.filter((e) => e.source !== "agent_progress");
              const dayTasks = filteredTasks.filter(
                (t) => new Date(t.dueDateEnd).toDateString() === dayStr
              );

              return (
                <div
                  key={idx}
                  onClick={() => openCreate(day)}
                  className={`border p-1.5 rounded-lg flex flex-col min-h-0 space-y-1 cursor-pointer transition-colors hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 ${
                    isSelected
                      ? "border-neutral-400 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-900/20"
                      : isToday
                      ? "border-neutral-300 dark:border-neutral-700 bg-neutral-50/30"
                      : "border-neutral-100 dark:border-neutral-850"
                  }`}
                >
                  {/* Day number */}
                  <span
                    className={`text-[9px] font-bold self-end font-mono ${
                      isToday ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {/* Items */}
                  <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 scrollbar-none">
                    {regularEvents.map((e) => {
                      const styles = getEventStyles(e.priority || "P4");
                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          className={`w-full text-left truncate text-[8px] font-semibold ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} block hover:brightness-95 transition-all`}
                          title={`[${getProjectName(e.projectId)}] ${e.title} — click to edit`}
                        >
                          <span className="opacity-60 block truncate text-[7px] uppercase tracking-wide">
                            {getProjectName(e.projectId)}
                          </span>
                          <span className="truncate flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                            <span>{e.title}</span>
                          </span>
                        </button>
                      );
                    })}

                    {dayTasks.map((t) => {
                      const styles = getEventStyles(t.priority || "P4");
                      return (
                        <span
                          key={t.id}
                          className={`w-full text-left truncate text-[8px] font-medium ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} block`}
                          title={`Task Due: ${t.title}`}
                        >
                          <span className="opacity-60 block truncate text-[7px] uppercase tracking-wide">
                            {getProjectName(t.projectId)}
                          </span>
                          <span className="truncate flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                            <span>{t.title}</span>
                          </span>
                        </span>
                      );
                    })}

                    {progressEvents.map((e) => {
                      const pct = e.progressPct ?? 0;
                      let barColor = "bg-neutral-400 dark:bg-neutral-600";
                      let bgBorderText = "bg-neutral-100 border-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200";
                      if (pct >= 80) {
                        barColor = "bg-neutral-700 dark:bg-neutral-400";
                        bgBorderText = "bg-neutral-100 border-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200";
                      } else if (pct >= 40) {
                        barColor = "bg-neutral-500 dark:bg-neutral-500";
                        bgBorderText = "bg-neutral-100 border-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200";
                      }
                      const isComplete = pct === 100;
                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                          className={`w-full text-left p-1 rounded border ${bgBorderText} flex flex-col gap-0.5 mt-0.5 hover:opacity-90 transition-opacity`}
                          title={`[Progress] ${e.title}: ${isComplete ? "Complete" : `${pct}%`}`}
                        >
                          <div className="flex items-center justify-between gap-1 w-full min-w-0">
                            <span className="truncate text-[8px] font-bold tracking-tight">{e.title}</span>
                            {isComplete ? (
                              <span className="flex items-center gap-0.5 text-[7px] font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
                                <Check size={8} strokeWidth={3} />
                                <span>Done</span>
                              </span>
                            ) : (
                              <span className="text-[7px] font-mono font-bold shrink-0">{pct}%</span>
                            )}
                          </div>
                          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-0.5">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 bg-surface border border-border-custom rounded-xl p-4 flex flex-col h-[500px] overflow-y-auto">
          {mode === "create" ? (
            <form onSubmit={handleSubmitCreate} className="flex flex-col h-full gap-3">
              <div className="flex justify-between items-center border-b border-border-custom pb-2 shrink-0">
                <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold">New Event</span>
                <button type="button" onClick={() => setMode("idle")} className="text-neutral-400 hover:text-neutral-600">
                  <X size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderFormFields()}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !form.title.trim() || !form.date || !form.projectId}
                className="shrink-0 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Creating..." : "Create Event"}
              </button>
            </form>
          ) : mode === "edit" ? (
            <form onSubmit={handleSubmitEdit} className="flex flex-col h-full gap-3">
              <div className="flex justify-between items-center border-b border-border-custom pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Pencil size={11} className="text-neutral-600" />
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono uppercase tracking-wider font-semibold">Edit Event</span>
                </div>
                <button type="button" onClick={() => { setMode("idle"); setEditingEventId(null); }} className="text-neutral-400 hover:text-neutral-600">
                  <X size={13} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderFormFields()}
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !form.title.trim() || !form.date}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-1.5 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={11} />
                  {isDeleting ? "Deleting..." : "Delete Event"}
                </button>
              </div>
            </form>
          ) : mode === "meeting-notes" ? (
            <div className="flex flex-col h-full gap-3">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-border-custom pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <FileText size={11} className="text-neutral-600" />
                  <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono uppercase tracking-wider font-semibold">Meeting Notes</span>
                </div>
                <button type="button" onClick={() => setMode("idle")} className="text-neutral-400 hover:text-neutral-600">
                  <X size={13} />
                </button>
              </div>

              {parsedDrafts.length === 0 ? (
                /* Input phase */
                <div className="flex flex-col gap-3 flex-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Project</label>
                    <select
                      value={meetingNotesProjectId}
                      onChange={(e) => setMeetingNotesProjectId(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col">
                    <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">Paste meeting notes</label>
                    <textarea
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder={"e.g.\nQ2 planning call — June 16\nStandup daily at 9am\nDeadline: ship v2 by June 20\nReview with client on Friday 3pm Zoom"}
                      className="flex-1 w-full text-xs px-2.5 py-2 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-300 resize-none min-h-[140px]"
                    />
                  </div>
                  {draftErrors && (
                    <p className="text-[10px] text-red-500">{draftErrors}</p>
                  )}
                  <button
                    onClick={handleParseNotes}
                    disabled={isParsing || !meetingNotes.trim() || !meetingNotesProjectId}
                    className="shrink-0 w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 size={11} className="animate-spin" />
                        <span>Parsing notes...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={11} />
                        <span>Extract Events</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Review phase */
                <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                  <p className="text-[10px] text-neutral-500 shrink-0">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">{parsedDrafts.length} event{parsedDrafts.length !== 1 ? "s" : ""}</span> found — review and confirm
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                    {parsedDrafts.map((draft, idx) => {
                      const styles = getEventStyles(draft.priority);
                      const isOpen = expandedDraft === idx;
                      return (
                        <div key={idx} className={`border ${styles.border} rounded-lg overflow-hidden`}>
                          <div className={`${styles.bg} px-2 py-1.5 flex items-center justify-between gap-1`}>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-semibold ${styles.text} truncate`}>{draft.title}</p>
                              <p className={`text-[9px] ${styles.text} opacity-70`}>{draft.date} · {draft.startTime}–{draft.endTime}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setExpandedDraft(isOpen ? null : idx)}
                                className={`${styles.text} opacity-70 hover:opacity-100`}
                              >
                                {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              <button
                                onClick={() => removeDraft(idx)}
                                className={`${styles.text} opacity-70 hover:opacity-100`}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                          {isOpen && (
                            <div className="p-2 space-y-1.5 bg-surface">
                              <input
                                type="text"
                                value={draft.title}
                                onChange={(e) => updateDraft(idx, "title", e.target.value)}
                                className="w-full text-[10px] px-2 py-1 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent"
                                placeholder="Title"
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="date"
                                  value={draft.date}
                                  onChange={(e) => updateDraft(idx, "date", e.target.value)}
                                  className="text-[10px] px-1.5 py-1 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
                                />
                                <select
                                  value={draft.priority}
                                  onChange={(e) => updateDraft(idx, "priority", e.target.value)}
                                  className="text-[10px] px-1.5 py-1 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
                                >
                                  {PRIORITIES.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <input
                                  type="time"
                                  value={draft.startTime}
                                  onChange={(e) => updateDraft(idx, "startTime", e.target.value)}
                                  className="text-[10px] px-1.5 py-1 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
                                />
                                <input
                                  type="time"
                                  value={draft.endTime}
                                  onChange={(e) => updateDraft(idx, "endTime", e.target.value)}
                                  className="text-[10px] px-1.5 py-1 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent"
                                />
                              </div>
                              {draft.description && (
                                <p className="text-[9px] text-neutral-500 leading-relaxed">{draft.description}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {draftErrors && (
                    <p className="text-[10px] text-red-500 shrink-0">{draftErrors}</p>
                  )}
                  <div className="shrink-0 flex flex-col gap-1.5">
                    <button
                      onClick={handleCreateAllDrafts}
                      disabled={isCreatingAll || parsedDrafts.length === 0}
                      className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isCreatingAll ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Creating events...</span>
                        </>
                      ) : (
                        <>
                          <Check size={11} />
                          <span>Create {parsedDrafts.length} Event{parsedDrafts.length !== 1 ? "s" : ""}</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => { setParsedDrafts([]); setDraftErrors(null); }}
                      className="w-full text-[10px] text-neutral-400 hover:text-neutral-600 py-1"
                    >
                      ← Back to notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 space-y-2">
              <CalendarIcon size={20} className="text-neutral-300" />
              <p className="text-[11px] text-neutral-400">
                Click a <span className="font-semibold text-neutral-600">date</span> to create an event, or click an <span className="font-semibold text-neutral-600">existing event</span> to edit it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
