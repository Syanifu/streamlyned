"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TodayItem } from "@/lib/today-rules";
import { Pin, EyeOff, CheckCircle2, MessageSquare, ExternalLink, Moon } from "lucide-react";
import { PRIORITY_MAP } from "@/components/project/tasks-tab";

interface TodayViewProps {
  initialItems: TodayItem[];
  userName: string;
}

export default function TodayView({ initialItems, userName }: TodayViewProps) {
  const [items, setItems] = useState<TodayItem[]>(initialItems);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load pins and hides from localStorage
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

  // Persist pins and hides
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

  // Filter out hidden items
  const visibleItems = items.filter((item) => !hiddenIds.includes(item.id));

  // Determine Do Today (pinned, overdue, due today)
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

  // Sort Do Today by urgency (overdue, due today, then pinned)
  doTodayItems.sort((a, b) => {
    const aPinned = pinnedIds.includes(a.id);
    const bPinned = pinnedIds.includes(b.id);
    if (aPinned && !bPinned) return 1;
    if (!aPinned && bPinned) return -1;
    return 0;
  });

  // Take up to 5 items for Do Today. Excess flows into Next Up
  const doTodayLimit = 5;
  const finalDoToday = doTodayItems.slice(0, doTodayLimit);
  const overflowDoToday = doTodayItems.slice(doTodayLimit);

  // Next Up: due tomorrow, due in 3 days, or overflow from Do Today
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

  // Take up to 5 items for Next Up. Excess flows into Watching
  const nextUpLimit = 5;
  const finalNextUp = nextUpItems.slice(0, nextUpLimit);
  const overflowNextUp = nextUpItems.slice(nextUpLimit);

  const finalWatching = [...watchingItems, ...overflowNextUp];

  const hasUrgentWork = finalDoToday.length > 0 || finalNextUp.length > 0;

  return (
    <div className="flex-1 flex flex-col space-y-8 pb-12">
      {/* Header Greeting */}
      <div className="flex justify-between items-end border-b border-border-custom pb-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
            Hello, {userName.split(" ")[0]}
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Welcome back. Here is the context mapped for you today.
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

      {/* Main Grid or Calm Empty State */}
      {!hasUrgentWork && finalWatching.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
          <Moon size={28} className="text-indigo-400 dark:text-indigo-500/80 animate-pulse" />
          <h2 className="text-base font-medium text-neutral-800 dark:text-neutral-200">
            Nothing is urgent today.
          </h2>
          <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
            All tasks are complete or scheduled in the future. Enjoy the calm, or explore projects in the sidebar.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Section 1: Do Today */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Do Today
              </h3>
              <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded-full font-mono">
                {finalDoToday.length}
              </span>
            </div>
            <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
              {finalDoToday.length === 0 ? (
                <div className="p-4 text-xs text-neutral-400 italic">
                  Nothing scheduled for today. Pin items below to place them here.
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
          </div>

          {/* Section 2: Next Up */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Next Up
              </h3>
              <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded-full font-mono">
                {finalNextUp.length}
              </span>
            </div>
            <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
              {finalNextUp.length === 0 ? (
                <div className="p-4 text-xs text-neutral-400 italic">
                  No near-term deadlines.
                </div>
              ) : (
                finalNextUp.map((item) => (
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
          </div>

          {/* Section 3: Watching */}
          {finalWatching.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Watching & Subscribed
                </h3>
                <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded-full font-mono">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inner helper row component
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
          <MessageSquare size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={item.targetUrl}
              className="text-xs font-medium text-neutral-800 hover:text-brand-accent dark:text-neutral-200 dark:hover:text-brand-accent truncate"
            >
              {isTask && `${PRIORITY_MAP[item.priority]?.icon || "🟢"} `}{item.title}
            </Link>
            <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.2 rounded shrink-0">
              {item.projectName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400">
            <span className="font-semibold text-neutral-500 dark:text-neutral-400">
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
            isPinned ? "text-indigo-600" : "text-neutral-400"
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
