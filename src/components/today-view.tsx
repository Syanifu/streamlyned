"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TodayItem } from "@/lib/today-rules";
import {
  Pin, EyeOff, CheckCircle2, MessageSquare, ExternalLink, Moon,
  Calendar, MapPin, Video, Clock, Users, MessageCircle, Hash,
  Flag, Bell, AlertTriangle,
} from "lucide-react";
import { PRIORITY_MAP } from "@/components/project/tasks-tab";

interface TodayViewProps {
  initialItems: TodayItem[];
  userName: string;
  currentUserId: string;
  events?: any[];
  recentDms?: any[];
  recentProjectChats?: any[];
  deadlineProjects?: any[];
  notifications?: any[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function TodayView({
  initialItems,
  userName,
  currentUserId,
  events = [],
  recentDms = [],
  recentProjectChats = [],
  deadlineProjects = [],
  notifications = [],
}: TodayViewProps) {
  const [items, setItems] = useState<TodayItem[]>(initialItems);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedPins = localStorage.getItem(`streamlyned_pins_${userName}`);
      const storedHides = localStorage.getItem(`streamlyned_hides_${userName}`);
      if (storedPins) setPinnedIds(JSON.parse(storedPins));
      if (storedHides) setHiddenIds(JSON.parse(storedHides));
    } catch (e) {
      console.error(e);
    }
    setIsLoaded(true);
  }, [userName]);

  const togglePin = (id: string) => {
    const updated = pinnedIds.includes(id)
      ? pinnedIds.filter((p) => p !== id)
      : [...pinnedIds, id];
    setPinnedIds(updated);
    localStorage.setItem(`streamlyned_pins_${userName}`, JSON.stringify(updated));
  };

  const toggleHide = (id: string) => {
    const updated = [...hiddenIds, id];
    setHiddenIds(updated);
    localStorage.setItem(`streamlyned_hides_${userName}`, JSON.stringify(updated));
  };

  const resetHides = () => {
    setHiddenIds([]);
    localStorage.removeItem(`streamlyned_hides_${userName}`);
  };

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <span className="text-xs text-neutral-400">Loading your workspace...</span>
      </div>
    );
  }

  const visibleItems = items.filter((item) => !hiddenIds.includes(item.id));

  const doTodayItems: TodayItem[] = [];
  const remainingItems: TodayItem[] = [];

  visibleItems.forEach((item) => {
    const isPinned = pinnedIds.includes(item.id);
    const isUrgent =
      item.rankDriver.includes("due today") ||
      item.rankDriver.includes("overdue") ||
      item.rankDriver.includes("follow-up overdue");

    if (isPinned || isUrgent) {
      doTodayItems.push(item);
    } else {
      remainingItems.push(item);
    }
  });

  doTodayItems.sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return 1;
    if (!aPinned && bPinned) return -1;
    return 0;
  });

  const doTodayLimit = 5;
  const finalDoToday = doTodayItems.slice(0, doTodayLimit);
  const overflowDoToday = doTodayItems.slice(doTodayLimit);

  const nextUpItems: TodayItem[] = [...overflowDoToday];
  const watchingItems: TodayItem[] = [];

  remainingItems.forEach((item) => {
    const isNextUp =
      item.rankDriver.includes("due tomorrow") ||
      item.rankDriver.includes("due in 2 days") ||
      item.rankDriver.includes("due in 3 days");

    if (isNextUp) {
      nextUpItems.push(item);
    } else {
      watchingItems.push(item);
    }
  });

  const nextUpLimit = 5;
  const finalNextUp = nextUpItems.slice(0, nextUpLimit);
  const overflowNextUp = nextUpItems.slice(nextUpLimit);
  const finalWatching = [...watchingItems, ...overflowNextUp];

  // Merge DMs + project chats into one sorted messages list
  const allMessages = [
    ...recentDms.map((g: any) => {
      const otherMembers = g.members.filter((m: any) => m.userId !== currentUserId);
      const displayName =
        otherMembers.length === 1
          ? otherMembers[0].name
          : otherMembers.map((m: any) => m.name.split(" ")[0]).join(", ");
      return {
        key: `dm-${g.id}`,
        kind: "dm" as const,
        href: `/dashboard/dm?group=${g.id}`,
        label: displayName,
        snippet: g.latestMessage?.content ?? "",
        sender: g.latestMessage?.senderName ?? "",
        at: g.latestMessage?.createdAt ?? "",
      };
    }),
    ...recentProjectChats.map((m: any) => ({
      key: `chat-${m.id}`,
      kind: "chat" as const,
      href: `/dashboard/projects/${m.projectId}?tab=chat`,
      label: m.projectName,
      snippet: m.content,
      sender: m.senderName,
      at: m.createdAt,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const hasAnyContent =
    finalDoToday.length > 0 ||
    finalNextUp.length > 0 ||
    finalWatching.length > 0 ||
    events.length > 0 ||
    allMessages.length > 0 ||
    deadlineProjects.length > 0 ||
    notifications.length > 0;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex-1 flex flex-col space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border-custom pb-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
            Hello, {userName.split(" ")[0]}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {hiddenIds.length > 0 && (
          <button
            onClick={resetHides}
            className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline"
          >
            Show {hiddenIds.length} hidden item{hiddenIds.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {!hasAnyContent ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Moon size={28} className="text-neutral-300 dark:text-neutral-600 animate-pulse" />
          <h2 className="text-base font-medium text-neutral-800 dark:text-neutral-200">
            Nothing is urgent today.
          </h2>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            All tasks are complete or scheduled in the future. Enjoy the calm, or explore projects below.
          </p>
          <Link
            href="/dashboard/calendar"
            className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline flex items-center gap-1"
          >
            <Calendar size={12} />
            View Calendar
          </Link>
        </div>
      ) : (
        <div className="space-y-10">

          {/* Today's Schedule */}
          {events.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Today's Schedule
                  </h3>
                  <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                    {events.length}
                  </span>
                </div>
                <Link
                  href="/dashboard/calendar"
                  className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                >
                  <span>Full calendar</span>
                  <ExternalLink size={10} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {events.map((event) => {
                  const styles = PRIORITY_MAP[event.priority] || PRIORITY_MAP.P4;
                  const isProgressEvent = event.source === "agent_progress";
                  return (
                    <Link
                      key={event.id}
                      href="/dashboard/calendar"
                      className={`relative p-4 bg-surface border border-border-custom hover:border-neutral-350 dark:hover:border-neutral-600 rounded-xl flex flex-col gap-2.5 border-l-4 ${styles.border} transition-all shadow-xs group`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">
                          {event.title}
                        </span>
                        <span className="text-[9px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded shrink-0 font-mono">
                          {event.project?.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
                        <Clock size={11} className="shrink-0 text-neutral-400" />
                        {isProgressEvent ? (
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{event.progressPct ?? 0}% complete</span>
                        ) : (
                          <span>{fmtTime(event.startAt)} – {fmtTime(event.endAt)}</span>
                        )}
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 truncate">
                          <MapPin size={11} className="shrink-0 text-neutral-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.videoCallLink && (
                        <a
                          href={event.videoCallLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[11px] text-neutral-700 dark:text-neutral-300 hover:underline"
                        >
                          <Video size={11} className="shrink-0" />
                          <span>Join call</span>
                        </a>
                      )}

                      {event.description && (
                        <p className="text-[10px] text-neutral-400 leading-relaxed line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {event.attendees?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                          <Users size={10} className="shrink-0" />
                          <span className="truncate">
                            {event.attendees.map((a: any) => a.name).join(", ")}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-border-custom">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${styles.bg} ${styles.text}`}>
                          {event.priority}
                        </span>
                        {event.source && event.source !== "manual" && (
                          <span className="text-[8px] text-neutral-400 font-mono uppercase tracking-wider">auto</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Messages — DMs + project chats */}
          {allMessages.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle size={13} className="text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Messages
                  </h3>
                  <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                    {allMessages.length}
                  </span>
                </div>
                <Link
                  href="/dashboard/dm"
                  className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                >
                  <span>All DMs</span>
                  <ExternalLink size={10} />
                </Link>
              </div>

              <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
                {allMessages.map((msg) => (
                  <Link
                    key={msg.key}
                    href={msg.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 group transition-colors"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center">
                      {msg.kind === "dm" ? (
                        <MessageCircle size={13} className="text-white" />
                      ) : (
                        <Hash size={13} className="text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {msg.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0 font-mono font-semibold bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900">
                          {msg.kind === "dm" ? "DM" : "chat"}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        <span className="text-neutral-600 font-medium">{msg.sender}:</span>{" "}
                        {msg.snippet}
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-400 shrink-0">{timeAgo(msg.at)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Task sections */}
          {(finalDoToday.length > 0 || finalNextUp.length > 0 || finalWatching.length > 0) && (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Do Today
                  </h3>
                  <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                    {finalDoToday.length}
                  </span>
                </div>
                <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
                  {finalDoToday.length === 0 ? (
                    <div className="p-4 text-xs text-neutral-400 italic">
                      Nothing urgent. Pin items below to bring them here.
                    </div>
                  ) : (
                    finalDoToday.map((item) => (
                      <TodayItemRow
                        key={item.id}
                        item={item}
                        isPinned={pinnedIds.includes(item.id)}
                        onPin={() => togglePin(item.id)}
                        onHide={() => toggleHide(item.id)}
                      />
                    ))
                  )}
                </div>
              </section>

              {finalNextUp.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Next Up
                    </h3>
                    <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                      {finalNextUp.length}
                    </span>
                  </div>
                  <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
                    {finalNextUp.map((item) => (
                      <TodayItemRow
                        key={item.id}
                        item={item}
                        isPinned={pinnedIds.includes(item.id)}
                        onPin={() => togglePin(item.id)}
                        onHide={() => toggleHide(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {finalWatching.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Watching & Subscribed
                    </h3>
                    <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                      {finalWatching.length}
                    </span>
                  </div>
                  <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
                    {finalWatching.map((item) => (
                      <TodayItemRow
                        key={item.id}
                        item={item}
                        isPinned={pinnedIds.includes(item.id)}
                        onPin={() => togglePin(item.id)}
                        onHide={() => toggleHide(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Project Deadlines */}
          {deadlineProjects.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Flag size={13} className="text-neutral-400" />
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Upcoming Deadlines
                </h3>
                <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                  {deadlineProjects.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {deadlineProjects.map((p: any) => {
                  const days = daysUntil(p.endDate);
                  const isUrgent = days <= 2;
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.id}`}
                      className={`p-4 bg-surface border rounded-xl flex flex-col gap-2 transition-all hover:shadow-sm group border-l-4 ${
                        isUrgent
                          ? "border-red-400 border-border-custom"
                          : "border-neutral-400 border-border-custom"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">
                          {p.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            isUrgent
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              : "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200"
                          }`}
                        >
                          {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d left`}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-auto">
                        <AlertTriangle size={10} className="text-neutral-400" />
                        <span>
                          Due{" "}
                          {new Date(p.endDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={13} className="text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Notifications
                  </h3>
                  <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                    {notifications.length}
                  </span>
                </div>
                <Link
                  href="/dashboard/notifications"
                  className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-1"
                >
                  <span>All notifications</span>
                  <ExternalLink size={10} />
                </Link>
              </div>

              <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
                {notifications.map((n: any) => {
                  const styles = PRIORITY_MAP[n.priority] || PRIORITY_MAP.P4;
                  return (
                    <Link
                      key={n.id}
                      href={n.targetUrl}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 group transition-colors border-l-4 ${styles.border}`}
                    >
                      <Bell size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{n.message}</p>
                      </div>
                      <span className="text-[10px] text-neutral-400 shrink-0">{timeAgo(n.createdAt)}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function TodayItemRow({
  item,
  isPinned,
  onPin,
  onHide,
}: {
  item: TodayItem;
  isPinned: boolean;
  onPin: () => void;
  onHide: () => void;
}) {
  const isTask = item.type === "task";
  const borderStripe = isTask ? PRIORITY_MAP[item.priority]?.border || "border-transparent" : "border-transparent";

  return (
    <div className={`flex items-center justify-between p-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 group border-l-4 ${borderStripe}`}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {isTask ? (
          <CheckCircle2 size={16} className="text-neutral-400 shrink-0 mt-0.5" />
        ) : (
          <MessageSquare size={16} className="text-neutral-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={item.targetUrl}
              className="text-xs font-medium text-neutral-800 hover:text-neutral-600 dark:text-neutral-200 dark:hover:text-neutral-400 truncate"
            >
              {isTask && `${PRIORITY_MAP[item.priority]?.icon || "🟢"} `}{item.title}
            </Link>
            <span className="text-[10px] bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 px-1.5 py-0.5 rounded shrink-0 font-mono">
              {item.projectName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
              {item.rankDriver}
            </span>
            <span>•</span>
            <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
        <button
          onClick={onPin}
          title={isPinned ? "Unpin from Today" : "Pin to Do Today"}
          className={`p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
            isPinned ? "text-neutral-800 dark:text-neutral-200" : "text-neutral-400"
          }`}
        >
          <Pin size={13} className={isPinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={onHide}
          title="Hide from view"
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
        >
          <EyeOff size={13} />
        </button>
        <Link
          href={item.targetUrl}
          title="Open detail"
          className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
        >
          <ExternalLink size={13} />
        </Link>
      </div>
    </div>
  );
}
