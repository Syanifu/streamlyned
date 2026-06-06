"use client";

import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Video, 
  Clock,
  Filter,
  CheckSquare
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
}

interface TaskDueCompact {
  id: string;
  title: string;
  dueDateEnd: string;
  projectId: string;
  priority: string;
}

const getEventStyles = (priority: string) => {
  const map: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    P1: { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-800 dark:text-red-300", border: "border-red-100 dark:border-red-950/40", dot: "bg-red-500" },
    P2: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-850 dark:text-orange-300", border: "border-orange-100 dark:border-orange-950/40", dot: "bg-orange-500" },
    P3: { bg: "bg-yellow-50 dark:bg-yellow-950/20", text: "text-yellow-800 dark:text-yellow-350", border: "border-yellow-100 dark:border-yellow-950/40", dot: "bg-yellow-500" },
    P4: { bg: "bg-green-50 dark:bg-green-950/20", text: "text-green-800 dark:text-green-300", border: "border-green-100 dark:border-green-950/40", dot: "bg-green-500" },
    P5: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-800 dark:text-blue-300", border: "border-blue-100 dark:border-blue-950/40", dot: "bg-blue-500" },
    P6: { bg: "bg-neutral-50 dark:bg-neutral-900/30", text: "text-neutral-500 dark:text-neutral-400", border: "border-neutral-200 dark:border-neutral-800/50", dot: "bg-neutral-400 dark:bg-neutral-600" },
  };
  return map[priority] || map.P4;
};

interface GlobalCalendarViewProps {
  projects: ProjectInfo[];
  events: CalendarEventCompact[];
  tasks: TaskDueCompact[];
}

export default function GlobalCalendarView({
  projects,
  events,
  tasks,
}: GlobalCalendarViewProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventCompact | null>(null);

  // Filter items by project
  const filteredEvents = selectedProjectId === "all" 
    ? events 
    : events.filter(e => e.projectId === selectedProjectId);

  const filteredTasks = selectedProjectId === "all" 
    ? tasks 
    : tasks.filter(t => t.projectId === selectedProjectId);

  // Generate Month Days Grid (35 days starting from Monday of this week)
  const getCalendarDays = () => {
    const days = [];
    const now = new Date();
    
    // Start of current week (Monday)
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const mondayOfWeek = new Date(now.setDate(now.getDate() + distanceToMonday));

    for (let i = 0; i < 35; i++) {
      const day = new Date(mondayOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
      days.push(day);
    }
    return days;
  };

  const calendarDays = getCalendarDays();
  const weekdaysLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Helper to find project name
  const getProjectName = (pId: string) => {
    return projects.find(p => p.id === pId)?.name || "Unknown Project";
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-5xl mx-auto min-h-0 pb-12">
      {/* Filters Bar */}
      <div className="flex items-center justify-between gap-4 shrink-0 bg-surface border border-border-custom px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <Filter size={14} className="text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Filter by Project
          </span>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setSelectedEvent(null);
          }}
          className="text-xs bg-surface border border-border-custom rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-accent text-neutral-700 dark:text-neutral-200"
        >
          <option value="all">All Projects ({projects.length})</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
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

              // Filter events and tasks for this day
              const dayEvents = filteredEvents.filter((e) => new Date(e.startAt).toDateString() === dayStr);
              const dayTasks = filteredTasks.filter((t) => new Date(t.dueDateEnd).toDateString() === dayStr);

              return (
                <div
                  key={idx}
                  className={`border border-neutral-100 dark:border-neutral-850 p-1.5 rounded-lg flex flex-col min-h-0 space-y-1 ${
                    isToday ? "bg-indigo-50/20 border-indigo-200 dark:border-indigo-900" : ""
                  }`}
                >
                  {/* Day Date Label */}
                  <span
                    className={`text-[9px] font-bold self-end font-mono ${
                      isToday ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {/* Items list */}
                  <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 scrollbar-none">
                    {/* Events */}
                    {/* Events */}
                    {dayEvents.map((e) => {
                      const styles = getEventStyles(e.priority || "P4");
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelectedEvent(e)}
                          className={`w-full text-left truncate text-[8px] font-semibold ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} block`}
                          title={`[${getProjectName(e.projectId)}] ${e.title}`}
                        >
                          <span className="opacity-60 block truncate text-[7px] uppercase tracking-wide">
                            {getProjectName(e.projectId)}
                          </span>
                          <span className="truncate block flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                            <span>{e.title}</span>
                          </span>
                        </button>
                      );
                    })}

                    {/* Tasks */}
                    {dayTasks.map((t) => {
                      const styles = getEventStyles(t.priority || "P4");
                      return (
                        <span
                          key={t.id}
                          className={`w-full text-left truncate text-[8px] font-medium ${styles.bg} ${styles.text} px-1 py-0.5 rounded border ${styles.border} block`}
                          title={`Task Due in [${getProjectName(t.projectId)}]: ${t.title}`}
                        >
                          <span className="opacity-60 block truncate text-[7px] uppercase tracking-wide">
                            {getProjectName(t.projectId)}
                          </span>
                          <span className="truncate block flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${styles.dot} shrink-0`} />
                            <span>{t.title}</span>
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Details Panel */}
        <div className="lg:col-span-1 bg-surface border border-border-custom rounded-xl p-4 flex flex-col h-[500px] overflow-y-auto">
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border-custom pb-2">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider font-semibold">
                  Event Details
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
                >
                  Close
                </button>
              </div>

               {/* Project & Priority Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-block bg-neutral-100 dark:bg-neutral-800 border border-border-custom px-2 py-0.5 rounded text-[9px] font-semibold text-neutral-500 uppercase tracking-wide">
                  {getProjectName(selectedEvent.projectId)}
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getEventStyles(selectedEvent.priority || "P4").bg} ${getEventStyles(selectedEvent.priority || "P4").text} border ${getEventStyles(selectedEvent.priority || "P4").border}`}>
                  {selectedEvent.priority || "P4"}
                </span>
              </div>

              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {selectedEvent.title}
              </h4>

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
                      className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}

                {selectedEvent.recurrence && (
                  <div className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded inline-block font-medium">
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
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <CalendarIcon size={20} className="text-neutral-300 mb-2" />
              <p className="text-[11px] text-neutral-400 italic">
                Select an event from the calendar grid to review schedule details and project context.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
