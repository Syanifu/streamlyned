"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createStructuredCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/actions/calendar";
import {
  Calendar as CalendarIcon,
  Plus,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Video,
  Clock,
  Users,
  Pencil,
  Trash2,
  X,
  ChevronRight,
  Wifi,
  Building2,
} from "lucide-react";

interface Attendee {
  id: string;
  user: { id: string; name: string; avatarUrl: string | null };
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
  priority: string;
  source?: string | null;
  sourceRef?: string | null;
  progressPct?: number | null;
  attendees: Attendee[];
}

interface TaskDueCompact {
  id: string;
  title: string;
  dueDateEnd: string;
  priority: string;
}

interface ProjectMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

const PRIORITY_OPTS = [
  { value: "P1", label: "P1 — Critical", dot: "bg-red-500" },
  { value: "P2", label: "P2 — High", dot: "bg-orange-500" },
  { value: "P3", label: "P3 — Medium", dot: "bg-yellow-500" },
  { value: "P4", label: "P4 — Normal", dot: "bg-green-500" },
  { value: "P5", label: "P5 — Low", dot: "bg-blue-500" },
  { value: "P6", label: "P6 — Archived", dot: "bg-neutral-400" },
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

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const toTimeStr = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const addHour = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

interface CalendarTabProps {
  projectId: string;
  currentUser: any;
  isClient: boolean;
  projectMembers: ProjectMember[];
}

export default function CalendarTab({ projectId, currentUser, isClient, projectMembers }: CalendarTabProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEventCompact[]>([]);
  const [tasks, setTasks] = useState<TaskDueCompact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState("acme-agency");

  // Sidebar mode: null | "create" | "detail" | "edit"
  const [sidebarMode, setSidebarMode] = useState<"idle" | "create" | "detail" | "edit">("idle");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventCompact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const today = toDateStr(new Date());
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(today);
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [formEndTime, setFormEndTime] = useState("11:00");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("P4");
  const [formMeetingType, setFormMeetingType] = useState<"inperson" | "virtual">("inperson");
  const [formLocation, setFormLocation] = useState("");
  const [formVideoLink, setFormVideoLink] = useState("");
  const [formAttendees, setFormAttendees] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/calendar`);
      const data = await res.json();
      setEvents(data.events || []);
      setTasks(data.tasks || []);
      setWorkspaceSlug(data.workspaceSlug || "acme-agency");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [projectId]);

  const resetForm = () => {
    setFormTitle("");
    setFormDate(today);
    setFormStartTime("10:00");
    setFormEndTime("11:00");
    setFormDescription("");
    setFormPriority("P4");
    setFormMeetingType("inperson");
    setFormLocation("");
    setFormVideoLink("");
    setFormAttendees([]);
  };

  const openCreate = (prefilledDate?: Date) => {
    resetForm();
    if (prefilledDate) setFormDate(toDateStr(prefilledDate));
    setSidebarMode("create");
    setSelectedEvent(null);
  };

  const openDetail = (ev: CalendarEventCompact) => {
    setSelectedEvent(ev);
    setSidebarMode("detail");
    setDeleteConfirm(false);
  };

  const openEdit = (ev: CalendarEventCompact) => {
    setSelectedEvent(ev);
    const start = new Date(ev.startAt);
    const end = new Date(ev.endAt);
    setFormTitle(ev.title);
    setFormDate(toDateStr(start));
    setFormStartTime(toTimeStr(start));
    setFormEndTime(toTimeStr(end));
    setFormDescription(ev.description || "");
    setFormPriority(ev.priority || "P4");
    setFormMeetingType(ev.videoCallLink ? "virtual" : "inperson");
    setFormLocation(ev.location || "");
    setFormVideoLink(ev.videoCallLink || "");
    setFormAttendees(ev.attendees.map((a) => a.user.id).filter((id) => id !== currentUser.id));
    setSidebarMode("edit");
    setDeleteConfirm(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setIsSubmitting(true);
    const res = await createStructuredCalendarEventAction(projectId, {
      title: formTitle,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      description: formDescription,
      location: formMeetingType === "inperson" ? formLocation : undefined,
      videoCallLink: formMeetingType === "virtual" ? formVideoLink : undefined,
      priority: formPriority,
      attendeeIds: formAttendees,
    });
    setIsSubmitting(false);
    if (res.success) {
      resetForm();
      setSidebarMode("idle");
      loadData();
      router.refresh();
    } else {
      alert(res.error || "Failed to create event");
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent || !formTitle.trim()) return;
    setIsSubmitting(true);
    const res = await updateCalendarEventAction(selectedEvent.id, {
      title: formTitle,
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      description: formDescription,
      location: formMeetingType === "inperson" ? formLocation : "",
      videoCallLink: formMeetingType === "virtual" ? formVideoLink : "",
      priority: formPriority,
      attendeeIds: formAttendees,
    });
    setIsSubmitting(false);
    if (res.success) {
      setSidebarMode("idle");
      setSelectedEvent(null);
      loadData();
      router.refresh();
    } else {
      alert(res.error || "Failed to update event");
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setIsSubmitting(true);
    const res = await deleteCalendarEventAction(selectedEvent.id);
    setIsSubmitting(false);
    if (res.success) {
      setSidebarMode("idle");
      setSelectedEvent(null);
      loadData();
      router.refresh();
    } else {
      alert(res.error || "Failed to delete event");
    }
  };

  const toggleAttendee = (userId: string) => {
    setFormAttendees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getIcalUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/ical/${workspaceSlug}/${currentUser.id}`;
  };

  const handleCopyIcal = () => {
    navigator.clipboard.writeText(getIcalUrl());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getCalendarDays = () => {
    const days = [];
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const mondayOfWeek = new Date(now.setDate(now.getDate() + distanceToMonday));
    for (let i = 0; i < 35; i++) {
      days.push(new Date(mondayOfWeek.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-neutral-400">Loading calendar...</span>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const weekdaysLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Shared form body used for both create and edit
  const renderForm = (isEdit: boolean) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex justify-between items-center border-b border-border-custom pb-2 mb-4 shrink-0">
        <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-wider">
          {isEdit ? "Edit Event" : "New Event"}
        </span>
        <button
          type="button"
          onClick={() => { setSidebarMode(isEdit && selectedEvent ? "detail" : "idle"); if (!isEdit) resetForm(); }}
          className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
        {/* Title */}
        <div className="space-y-1">
          <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            Event Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Design Review"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            Date
          </label>
          <input
            type="date"
            required
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-300"
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
              Start
            </label>
            <input
              type="time"
              required
              value={formStartTime}
              onChange={(e) => {
                setFormStartTime(e.target.value);
                setFormEndTime(addHour(e.target.value));
              }}
              className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-300"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
              End
            </label>
            <input
              type="time"
              required
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
              className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface rounded-lg focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-300"
            />
          </div>
        </div>

        {/* Meeting type toggle */}
        <div className="space-y-2">
          <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            Meeting Type
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setFormMeetingType("inperson")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                formMeetingType === "inperson"
                  ? "bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white"
                  : "border-border-custom text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <Building2 size={11} />
              <span>In Person</span>
            </button>
            <button
              type="button"
              onClick={() => setFormMeetingType("virtual")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${
                formMeetingType === "virtual"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
                  : "border-border-custom text-neutral-600 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              <Wifi size={11} />
              <span>Virtual</span>
            </button>
          </div>

          {formMeetingType === "inperson" && (
            <input
              type="text"
              placeholder="Location (e.g. Office, Room 3)"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
            />
          )}

          {formMeetingType === "virtual" && (
            <div className="rounded-lg border border-border-custom bg-neutral-50 dark:bg-neutral-900/20 p-2.5 space-y-1.5">
              <p className="text-[9px] font-semibold text-neutral-600 uppercase tracking-wider flex items-center gap-1">
                <Video size={10} />
                Video Call Link
              </p>
              <input
                type="url"
                placeholder="https://meet.google.com/... or Zoom link"
                value={formVideoLink}
                onChange={(e) => setFormVideoLink(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-white dark:bg-neutral-900/50 rounded-lg focus:outline-none focus:border-neutral-500 placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
              />
            </div>
          )}
        </div>

        {/* Attendees */}
        {projectMembers.length > 0 && (
          <div className="space-y-2">
            <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Users size={9} />
              Add People
            </label>
            <div className="space-y-1">
              {projectMembers
                .filter((m) => m.id !== currentUser.id)
                .map((m) => {
                  const selected = formAttendees.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all ${
                        selected
                          ? "border-neutral-800 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-800"
                          : "border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                      }`}
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-5 h-5 rounded-full shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-neutral-600">{m.name[0]}</span>
                        </div>
                      )}
                      <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate flex-1">
                        {m.name}
                      </span>
                      {selected && <Check size={11} className="text-neutral-600 shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            Notes (Optional)
          </label>
          <textarea
            placeholder="Agenda or context..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            rows={2}
            className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 resize-none leading-relaxed text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">
            Priority
          </label>
          <div className="grid grid-cols-3 gap-1">
            {PRIORITY_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormPriority(opt.value)}
                className={`flex items-center gap-1 px-1.5 py-1 rounded border text-[9px] font-semibold transition-all ${
                  formPriority === opt.value
                    ? "border-neutral-400 dark:border-neutral-500 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
                    : "border-border-custom text-neutral-400 hover:text-neutral-600"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot} shrink-0`} />
                <span>{opt.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-3 mt-3 border-t border-border-custom shrink-0">
        <button
          type="submit"
          disabled={isSubmitting || !formTitle.trim()}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-950 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? (
            <span className="opacity-70">Saving...</span>
          ) : (
            <>{isEdit ? "Save Changes" : "Create Event"}</>
          )}
        </button>
      </div>
    </form>
  );

  // Event detail panel
  const renderDetail = (ev: CalendarEventCompact) => {
    const styles = getEventStyles(ev.priority || "P4");
    const start = new Date(ev.startAt);
    const end = new Date(ev.endAt);
    const isProgress = ev.source === "agent_progress";

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-custom pb-2 mb-3 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${styles.bg} ${styles.text} border ${styles.border}`}>
            {ev.priority || "P4"}
          </span>
          <div className="flex items-center gap-1">
            {!isProgress && !isClient && (
              <>
                <button
                  onClick={() => openEdit(ev)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-red-500 font-semibold">Delete?</span>
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 px-1.5 py-0.5 rounded"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-[9px] font-semibold text-neutral-400 hover:text-neutral-600"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="p-1 rounded text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => { setSidebarMode("idle"); setSelectedEvent(null); setDeleteConfirm(false); }}
              className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Title */}
          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 leading-tight">
            {ev.title}
          </h4>

          {/* Progress bar (agent events) */}
          {isProgress && (
            <div className="border border-border-custom p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Project Progress
                </span>
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  {ev.progressPct ?? 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    (ev.progressPct ?? 0) >= 80 ? "bg-emerald-500" : (ev.progressPct ?? 0) >= 40 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${ev.progressPct ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Time */}
          <div className="flex items-start gap-2 text-xs text-neutral-600">
            <Clock size={13} className="text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p>
                {start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p className="text-neutral-400">
                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          {/* Location */}
          {ev.location && (
            <div className="flex items-center gap-2 text-xs text-neutral-600">
              <MapPin size={13} className="text-neutral-400 shrink-0" />
              <span>{ev.location}</span>
            </div>
          )}

          {/* Virtual meeting */}
          {ev.videoCallLink && (
            <div className="rounded-xl border border-border-custom bg-neutral-50 dark:bg-neutral-900/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Wifi size={12} className="text-neutral-600" />
                <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Virtual Meeting
                </span>
              </div>
              <a
                href={ev.videoCallLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <span>Join Meeting</span>
                <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Recurrence */}
          {ev.recurrence && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                Repeats {ev.recurrence.toLowerCase()}
              </span>
            </div>
          )}

          {/* Attendees */}
          {ev.attendees.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Users size={9} />
                {ev.attendees.length} {ev.attendees.length === 1 ? "Person" : "People"}
              </p>
              <div className="space-y-1.5">
                {ev.attendees.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    {a.user.avatarUrl ? (
                      <img src={a.user.avatarUrl} alt={a.user.name} className="w-5 h-5 rounded-full" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-neutral-600">{a.user.name[0]}</span>
                      </div>
                    )}
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400">{a.user.name}</span>
                    {a.user.id === currentUser.id && (
                      <span className="text-[8px] text-neutral-400 font-semibold">(you)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {ev.description && !ev.description.startsWith("Created via natural language") && (
            <div className="border-t border-border-custom pt-3 space-y-1">
              <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Notes</p>
              <p className="text-[11px] text-neutral-600 leading-relaxed">{ev.description}</p>
            </div>
          )}
        </div>

        {/* Edit button at bottom */}
        {!isProgress && !isClient && (
          <div className="pt-3 mt-3 border-t border-border-custom shrink-0">
            <button
              onClick={() => openEdit(ev)}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-900/30 text-neutral-600 dark:text-neutral-400 rounded-lg text-xs font-semibold transition-colors"
            >
              <Pencil size={12} />
              <span>Edit Event</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Project Calendar
          </h3>
          <button
            onClick={handleCopyIcal}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-900/30 text-neutral-600 rounded text-[10px] font-semibold transition-colors"
            title="Subscribe in Google/Apple Calendar"
          >
            {isCopied ? <Check size={11} className="text-neutral-600" /> : <Copy size={11} />}
            <span>{isCopied ? "iCal URL Copied" : "iCal Feed"}</span>
          </button>
        </div>

        {!isClient && (
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white dark:text-neutral-950 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={13} />
            <span>Add Event</span>
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 flex flex-col bg-surface border border-border-custom rounded-xl p-4 overflow-hidden h-[500px]">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 border-b border-border-custom pb-2 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            {weekdaysLabels.map((lbl) => <div key={lbl}>{lbl}</div>)}
          </div>

          {/* Days grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 mt-1 overflow-y-auto">
            {calendarDays.map((day, idx) => {
              const dayStr = day.toDateString();
              const isToday = new Date().toDateString() === dayStr;
              const dayEvents = events.filter((e) => new Date(e.startAt).toDateString() === dayStr);
              const progressEvents = dayEvents.filter((e) => e.source === "agent_progress");
              const regularEvents = dayEvents.filter((e) => e.source !== "agent_progress");
              const dayTasks = tasks.filter((t) => new Date(t.dueDateEnd).toDateString() === dayStr);

              return (
                <div
                  key={idx}
                  onClick={() => !isClient && openCreate(day)}
                  className={`border p-1.5 rounded-lg flex flex-col min-h-0 space-y-1 cursor-pointer transition-colors ${
                    isToday
                      ? "bg-neutral-100/50 border-neutral-300 dark:bg-neutral-900/20 dark:border-neutral-700"
                      : "border-neutral-100 dark:border-neutral-800/50 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold font-mono ${
                        isToday ? "text-neutral-900 dark:text-white font-bold" : "text-neutral-400"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {!isClient && (
                      <ChevronRight size={8} className="text-neutral-300 dark:text-neutral-700 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                    {regularEvents.map((e) => {
                      const s = getEventStyles(e.priority || "P4");
                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); openDetail(e); }}
                          className={`w-full text-left truncate text-[8px] font-semibold ${s.bg} ${s.text} px-1 py-0.5 rounded border ${s.border} flex items-center gap-1`}
                        >
                          <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
                          <span className="truncate">{e.title}</span>
                          {e.attendees.length > 1 && (
                            <Users size={7} className="shrink-0 opacity-60" />
                          )}
                        </button>
                      );
                    })}

                    {dayTasks.map((t) => {
                      const s = getEventStyles(t.priority || "P4");
                      return (
                        <span
                          key={t.id}
                          className={`w-full text-left truncate text-[8px] font-medium ${s.bg} ${s.text} px-1 py-0.5 rounded border ${s.border} flex items-center gap-1`}
                          title={`Due: ${t.title}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${s.dot} shrink-0`} />
                          <span className="truncate">Due: {t.title}</span>
                        </span>
                      );
                    })}

                    {progressEvents.map((e) => {
                      const pct = e.progressPct ?? 0;
                      const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
                      const bgText = pct >= 80
                        ? "bg-neutral-100 border-border-custom text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                        : pct >= 40
                        ? "bg-neutral-200 border-border-custom text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300"
                        : "bg-neutral-50 border-border-custom text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300";

                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); openDetail(e); }}
                          className={`w-full text-left p-1 rounded border ${bgText} flex flex-col gap-0.5 mt-0.5 hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className="truncate text-[8px] font-bold">{e.title}</span>
                            <span className="text-[7px] font-mono font-bold shrink-0">{pct}%</span>
                          </div>
                          <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
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
          {sidebarMode === "create" && renderForm(false)}
          {sidebarMode === "edit" && renderForm(true)}
          {sidebarMode === "detail" && selectedEvent && renderDetail(selectedEvent)}
          {sidebarMode === "idle" && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-10">
              <CalendarIcon size={20} className="text-neutral-300" />
              <p className="text-[11px] text-neutral-400 italic leading-relaxed max-w-[160px]">
                Click a day to add an event, or select an existing event to view details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
