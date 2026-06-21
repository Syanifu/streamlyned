"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  markNotificationReadAction, 
  markAllNotificationsReadAction, 
  getSuppressionExplanationAction,
  confirmAgentEventAction,
  dismissAgentEventAction
} from "@/app/actions/notifications";
import { Bell, Check, BellOff, Info, ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";

interface NotificationCompact {
  id: string;
  type: string;
  title: string;
  message: string;
  targetUrl: string;
  isRead: boolean;
  isSuppressed: boolean;
  createdAt: Date;
}

interface NotificationsViewProps {
  notifications: any[];
}

export default function NotificationsView({ notifications = [] }: NotificationsViewProps) {
  const router = useRouter();
  const [activeExplanationId, setActiveExplanationId] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleMarkRead = async (id: string) => {
    await markNotificationReadAction(id);
    router.refresh();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    router.refresh();
  };

  const handleConfirmAgent = async (id: string) => {
    setIsSubmitting(id);
    const res = await confirmAgentEventAction(id);
    setIsSubmitting(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to confirm event");
    }
  };

  const handleDismissAgent = async (id: string) => {
    setIsSubmitting(id);
    const res = await dismissAgentEventAction(id);
    setIsSubmitting(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to dismiss event");
    }
  };

  const handleExplainSuppression = async (id: string) => {
    if (activeExplanationId === id) {
      setActiveExplanationId(null);
      setExplanationText(null);
      return;
    }
    
    setLoadingExplanation(true);
    setActiveExplanationId(id);
    const res = await getSuppressionExplanationAction(id);
    if (res && res.reason) {
      setExplanationText(res.reason);
    } else {
      setExplanationText("No suppression details found.");
    }
    setLoadingExplanation(false);
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border-custom pb-4 shrink-0">
        <div>
          <h1 className="text-xl font-medium tracking-tight text-neutral-900 dark:text-white">
            Inbox
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Review updates, assignments, and discussions. Suppressed push reminders stay here for safe retrieval.
          </p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium"
          >
            <Check size={13} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-6">
        {/* Unread Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Unread ({unread.length})
          </h3>
          <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
            {unread.length === 0 ? (
              <p className="p-4 text-xs text-neutral-400 italic">No unread notifications.</p>
            ) : (
              unread.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={() => handleMarkRead(n.id)}
                  onExplain={() => handleExplainSuppression(n.id)}
                  isExplaining={activeExplanationId === n.id}
                  explanationText={explanationText}
                  loadingExplanation={loadingExplanation}
                  onConfirmAgent={() => handleConfirmAgent(n.id)}
                  onDismissAgent={() => handleDismissAgent(n.id)}
                  isSubmitting={isSubmitting === n.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Read Section */}
        {read.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Previously Read
            </h3>
            <div className="bg-surface border border-border-custom rounded-lg divide-y divide-border-custom overflow-hidden">
              {read.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkRead={() => {}}
                  onExplain={() => handleExplainSuppression(n.id)}
                  isExplaining={activeExplanationId === n.id}
                  explanationText={explanationText}
                  loadingExplanation={loadingExplanation}
                  onConfirmAgent={() => {}}
                  onDismissAgent={() => {}}
                  isSubmitting={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inner helper row component
function NotificationRow({
  notification,
  onMarkRead,
  onExplain,
  isExplaining,
  explanationText,
  loadingExplanation,
  onConfirmAgent,
  onDismissAgent,
  isSubmitting,
}: {
  notification: any;
  onMarkRead: () => void;
  onExplain: () => void;
  isExplaining: boolean;
  explanationText: string | null;
  loadingExplanation: boolean;
  onConfirmAgent: () => void;
  onDismissAgent: () => void;
  isSubmitting: boolean;
}) {
  const isAgentConfirm = notification.type === "AGENT_CONFIRM";

  if (isAgentConfirm && !notification.isRead) {
    return (
      <div className="p-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 flex items-center justify-between gap-4 border-l-4 border-neutral-800 dark:border-neutral-300 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <CalendarIcon size={16} className="text-neutral-600 shrink-0" />
          <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Next sync: "{notification.title}"
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onConfirmAgent}
            disabled={isSubmitting}
            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-50"
          >
            Add to calendar
          </button>
          <button
            onClick={onDismissAgent}
            disabled={isSubmitting}
            className="px-2.5 py-1.5 border border-border-custom hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/10 flex flex-col gap-2 group border-l-4 ${
      notification.priority === "P1" ? "border-red-500 bg-red-500/5 dark:bg-red-950/10" : "border-transparent"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="relative shrink-0 mt-0.5">
            {notification.isSuppressed ? (
              <BellOff size={16} className="text-neutral-400" aria-label="Push Suppressed" />
            ) : (
              <Bell size={16} className="text-neutral-400" />
            )}
            {notification.priority === "P1" && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-surface animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {notification.priority === "P1" && (
                <span className="bg-red-600 dark:bg-red-900 text-white text-[8px] font-extrabold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider animate-pulse">
                  Critical P1
                </span>
              )}
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {notification.title}
              </span>
              {notification.isSuppressed && (
                <span className="bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">
                  Push Suppressed
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              {isAgentConfirm ? "Scheduled to calendar successfully." : notification.message}
            </p>
            <span className="text-[10px] text-neutral-400 font-mono mt-1 block">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <button
              onClick={onMarkRead}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}

          {notification.isSuppressed && (
            <button
              onClick={onExplain}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
              title="Why was push suppressed?"
            >
              <Info size={14} />
            </button>
          )}

          <Link
            href={notification.targetUrl}
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
            title="Open detail link"
          >
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Suppression explanation panel */}
      {isExplaining && (
        <div className="mt-2 text-xs bg-neutral-50 border border-border-custom dark:bg-neutral-900/30 text-neutral-700 dark:text-neutral-300 p-3 rounded-lg leading-relaxed animate-in fade-in duration-200">
          <p className="font-semibold text-[10px] uppercase tracking-wider text-neutral-600 mb-1">
            Smart Reminder Suppress Explanation
          </p>
          {loadingExplanation ? (
            <span>Analyzing suppression heuristic...</span>
          ) : (
            <span>{explanationText}</span>
          )}
        </div>
      )}
    </div>
  );
}
