"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEventAction } from "@/app/actions/calendar";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink,
  MapPin,
  Video,
  Clock
} from "lucide-react";

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
}

interface TaskDueCompact {
  id: string;
  title: string;
  dueDateEnd: string;
  priority: string;
}

const getEventStyles = (priority: string) => {
  const map: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    P1: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-800 dark:text-red-300", border: "border-red-100 dark:border-red-950/40", dot: "bg-red-500" },
    P2: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-850 dark:text-orange-300", border: "border-orange-100 dark:border-orange-950/40", dot: "bg-orange-500" },
    P3: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-800 dark:text-yellow-350", border: "border-yellow-100 dark:border-yellow-950/40", dot: "bg-yellow-500" },
    P4: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-800 dark:text-green-300", border: "border-green-100 dark:border-green-950/40", dot: "bg-green-500" },
    P5: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-800 dark:text-blue-300", border: "border-blue-100 dark:border-blue-950/40", dot: "bg-blue-500" },
    P6: { bg: "bg-neutral-50 dark:bg-neutral-900/30", text: "text-neutral-500 dark:text-neutral-400", border: "border-neutral-200 dark:border-neutral-800/50", dot: "bg-neutral-450 dark:bg-neutral-600" },
  };
  return map[priority] || map.P4;
};

interface CalendarTabProps {
  projectId: string;
  currentUser: any;
  isClient: boolean;
}

export default function CalendarTab({
  projectId,
  currentUser,
  isClient,
}: CalendarTabProps) {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEventCompact[]>([]);
  const [tasks, setTasks] = useState<TaskDueCompact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState("acme-agency");

  // Form states
  const [isCreating, setIsCreating] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [location, setLocation] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [eventPriority, setEventPriority] = useState("P4");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected event details modal/state
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventCompact | null>(null);

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

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInput.trim()) return;
    setIsSubmitting(true);

    const res = await createCalendarEventAction(projectId, rawInput, location, videoLink, eventPriority);
    if (res.success) {
      setRawInput("");
      setLocation("");
      setVideoLink("");
      setEventPriority("P4");
      setIsCreating(false);
      loadData();
      router.refresh();
    } else {
      alert(res.error || "Failed to schedule event");
    }
    setIsSubmitting(false);
  };

  // iCal Feed URL setup
  const getIcalUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/ical/${workspaceSlug}/${currentUser.id}`;
  };

  const handleCopyIcal = () => {
    navigator.clipboard.writeText(getIcalUrl());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Generate Month Days Grid (Fixed: Simple grid representation of current/next 30 days starting from Monday of this week)
  const getCalendarDays = () => {
    const days = [];
    const now = new Date();
    
    // Start of current week (Monday)
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const mondayOfWeek = new Date(now.setDate(now.getDate() + distanceToMonday));

    // Generate 35 days (5 weeks) from Monday of this week
    for (let i = 0; i < 35; i++) {
      const day = new Date(mondayOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(day);
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

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Header Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Project Calendar
          </h3>

          {/* iCal Subscription */}
          <button
            onClick={handleCopyIcal}
            className="flex items-center gap-1.5 px-2.5 py-1 border border-border-custom hover:bg-neutral-50 text-neutral-500 rounded text-[10px] font-semibold transition-colors"
            title="Subscribe in Google/Apple Calendar"
          >
            {isCopied ? <Check size={11} className="text-brand-success" /> : <Copy size={11} />}
            <span>{isCopied ? "iCal URL Copied" : "iCal Feed"}</span>
          </button>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium"
        >
          <Plus size={13} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Calendar Grid (Col-Span 3) */}
        <div className="lg:col-span-3 flex flex-col bg-surface border border-border-custom rounded-xl p-4 overflow-hidden h-[500px]">
          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 border-b border-border-custom pb-2 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
            {weekdaysLabels.map((lbl) => (
              <div key={lbl}>{lbl}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 mt-1 overflow-y-auto">
            {calendarDays.map((day, idx) => {
              const dayStr = day.toDateString();
              const isToday = new Date().toDateString() === dayStr;

              // Filter events on this day
              const dayEvents = events.filter((e) => new Date(e.startAt).toDateString() === dayStr);
              // Filter task due dates on this day
              const dayTasks = tasks.filter((t) => new Date(t.dueDateEnd).toDateString() === dayStr);

              return (
                <div
                  key={idx}
                  className={`border border-neutral-100 dark:border-neutral-800/50 p-1.5 rounded-lg flex flex-col min-h-0 space-y-1 ${
                    isToday ? "bg-indigo-50/20 border-indigo-200" : ""
                  }`}
                >
                  {/* Day Date Label */}
                  <span
                    className={`text-[9px] font-bold self-end font-mono ${
                      isToday ? "text-indigo-600 font-bold" : "text-neutral-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {/* Items list */}
                  <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
                    {/* Events */}
                    {dayEvents.map((e) => {
                      const styles = getEventStyles(e.priority || "P4");
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          className={`w-full text-left truncate text-[8px] font-semibold ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} flex items-center gap-1`}
                        >
                          <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                          <span className="truncate">{e.title}</span>
                        </button>
                      );
                    })}

                    {/* Tasks */}
                    {dayTasks.map((t) => {
                      const styles = getEventStyles(t.priority || "P4");
                      return (
                        <span
                          key={t.id}
                          className={`w-full text-left truncate text-[8px] font-medium ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} flex items-center gap-1`}
                          title={`Task Due: ${t.title}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                          <span className="truncate">Due: {t.title}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Event Scheduler or Details (Col-Span 1) */}
        <div className="lg:col-span-1 bg-surface border border-border-custom rounded-xl p-4 flex flex-col h-[500px] overflow-y-auto">
          {isCreating ? (
            /* Create Event Form */
            <form onSubmit={handleCreateEvent} className="space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border-custom pb-2">
                  <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                    Schedule Event
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600 underline"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Event Info (Natural text)
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Design review every Friday at 2pm"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    rows={3}
                    className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400 resize-none leading-relaxed"
                  />
                  <span className="text-[8px] text-neutral-400 leading-tight block">
                    Parser extracts the title, date/time, and recurrence automatically.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Office or Zoom"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Video link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://zoom.us/..."
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Priority
                  </label>
                  <select
                    value={eventPriority}
                    onChange={(e) => setEventPriority(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-border-custom bg-surface dark:bg-neutral-900 rounded focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200 font-semibold"
                  >
                    <option value="P1">🔴 P1 — Critical</option>
                    <option value="P2">🟠 P2 — High</option>
                    <option value="P3">🟡 P3 — Medium</option>
                    <option value="P4">🟢 P4 — Normal</option>
                    <option value="P5">🔵 P5 — Low</option>
                    <option value="P6">⚪ P6 — Archived</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !rawInput.trim()}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold py-2 disabled:opacity-50 transition-colors mt-4"
              >
                Schedule Event
              </button>
            </form>
          ) : selectedEvent ? (
            /* Selected Event Details */
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border-custom pb-2">
                <span className="text-[10px] text-indigo-600 font-mono uppercase tracking-wider font-semibold">
                  Event Details
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-[10px] text-neutral-400 hover:text-neutral-600 underline"
                >
                  Close
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${getEventStyles(selectedEvent.priority || "P4").bg} ${getEventStyles(selectedEvent.priority || "P4").text} border ${getEventStyles(selectedEvent.priority || "P4").border}`}>
                  {selectedEvent.priority || "P4"}
                </span>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {selectedEvent.title}
                </h4>
              </div>

              <div className="space-y-2.5 text-xs text-neutral-500">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-neutral-400 shrink-0" />
                  <span>
                    {new Date(selectedEvent.startAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-neutral-400 shrink-0" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.videoCallLink && (
                  <div className="flex items-center gap-2">
                    <Video size={13} className="text-neutral-400 shrink-0" />
                    <a
                      href={selectedEvent.videoCallLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline truncate flex items-center gap-1"
                    >
                      <span>Join Meeting</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}

                {selectedEvent.recurrence && (
                  <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded inline-block font-medium">
                    Repeats {selectedEvent.recurrence.toLowerCase()}
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div className="border-t border-border-custom pt-3 mt-3">
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Description
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Quiet Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <CalendarIcon size={20} className="text-neutral-300 mb-2" />
              <p className="text-[11px] text-neutral-400 italic">
                Select an event from the calendar grid to review schedule details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
