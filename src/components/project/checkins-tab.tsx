"use client";

import React, { useState } from "react";
import { 
  HelpCircle, 
  Plus, 
  Calendar, 
  Clock, 
  Check, 
  Trash2, 
  MessageSquare,
  User,
  AlertCircle
} from "lucide-react";
import { 
  createCheckInQuestion, 
  toggleCheckInQuestionActive, 
  deleteCheckInQuestion, 
  submitCheckInAnswer 
} from "@/app/actions/checkins";
import { toast } from "react-hot-toast";

interface UserCompact {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CheckInQuestionWithAnswers {
  id: string;
  question: string;
  scheduleDay: string;
  scheduleTime: string;
  active: boolean;
  createdAt: Date | string;
  answers: {
    id: string;
    content: string;
    createdAt: Date | string;
    user: UserCompact;
  }[];
}

interface CheckinsTabProps {
  projectId: string;
  currentUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  isClient: boolean;
  questions: CheckInQuestionWithAnswers[];
}

export default function CheckinsTab({
  projectId,
  currentUser,
  isClient,
  questions: initialQuestions,
}: CheckinsTabProps) {
  const [questions, setQuestions] = useState<CheckInQuestionWithAnswers[]>(initialQuestions);
  const [activeTab, setActiveTab] = useState<"feed" | "manage">("feed");
  
  // New Question Form State
  const [newQuestion, setNewQuestion] = useState("");
  const [newDay, setNewDay] = useState("Monday");
  const [newTime, setNewTime] = useState("09:00");
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  // Answers State
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submittingAnswers, setSubmittingAnswers] = useState<Record<string, boolean>>({});

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
  ];

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setIsSubmittingQuestion(true);
    const res = await createCheckInQuestion(projectId, newQuestion, newDay, newTime);
    setIsSubmittingQuestion(false);

    if (res.success && res.question) {
      toast.success("Check-in question created successfully!");
      
      const newQ: CheckInQuestionWithAnswers = {
        id: res.question.id,
        question: res.question.question,
        scheduleDay: res.question.scheduleDay,
        scheduleTime: res.question.scheduleTime,
        active: res.question.active,
        createdAt: res.question.createdAt,
        answers: [],
      };
      
      setQuestions([newQ, ...questions]);
      setNewQuestion("");
    } else {
      toast.error(res.error || "Failed to create check-in question");
    }
  };

  const handleToggleActive = async (qId: string, currentActive: boolean) => {
    const res = await toggleCheckInQuestionActive(qId, !currentActive);
    if (res.success) {
      toast.success(res.question?.active ? "Check-in activated" : "Check-in paused");
      setQuestions(
        questions.map((q) =>
          q.id === qId ? { ...q, active: res.question!.active } : q
        )
      );
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("Are you sure you want to delete this check-in question and all of its answers?")) {
      return;
    }

    const res = await deleteCheckInQuestion(qId);
    if (res.success) {
      toast.success("Check-in deleted");
      setQuestions(questions.filter((q) => q.id !== qId));
    } else {
      toast.error(res.error || "Failed to delete check-in");
    }
  };

  const handleSubmitAnswer = async (qId: string) => {
    const draft = answerDrafts[qId];
    if (!draft || !draft.trim()) return;

    setSubmittingAnswers({ ...submittingAnswers, [qId]: true });
    const res = await submitCheckInAnswer(qId, draft);
    setSubmittingAnswers({ ...submittingAnswers, [qId]: false });

    if (res.success && res.answer) {
      toast.success("Answer posted!");
      
      // Update UI
      const updatedQuestions = questions.map((q) => {
        if (q.id === qId) {
          const newAns = {
            id: res.answer!.id,
            content: res.answer!.content,
            createdAt: res.answer!.createdAt,
            user: {
              id: currentUser.id,
              name: currentUser.name,
              avatarUrl: currentUser.avatarUrl,
            },
          };
          return {
            ...q,
            answers: [newAns, ...q.answers],
          };
        }
        return q;
      });

      setQuestions(updatedQuestions);
      setAnswerDrafts({ ...answerDrafts, [qId]: "" });
    } else {
      toast.error(res.error || "Failed to submit answer");
    }
  };

  // Compile all answers across all questions, sort by date desc
  const allAnswers = questions.flatMap((q) => 
    q.answers.map((a) => ({
      ...a,
      questionId: q.id,
      questionText: q.question,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Determine which active questions need answers today from the current user.
  // We check if the user has answered today (same calendar date).
  const pendingQuestions = questions.filter((q) => {
    if (!q.active) return false;
    const hasAnsweredToday = q.answers.some((ans) => {
      const ansDate = new Date(ans.createdAt).toDateString();
      const todayDate = new Date().toDateString();
      return ans.user.id === currentUser.id && ansDate === todayDate;
    });
    return !hasAnsweredToday;
  });

  return (
    <div className="flex-1 flex flex-col space-y-6 min-h-0">
      {/* Pending Check-ins (Simulated Scheduled Check-ins prompt) */}
      {pendingQuestions.length > 0 && (
        <div className="bg-indigo-50/20 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5 space-y-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <AlertCircle size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Pending Auto Check-ins
            </h3>
          </div>

          <div className="space-y-4">
            {pendingQuestions.map((q) => (
              <div 
                key={q.id}
                className="bg-surface border border-border-custom p-4 rounded-lg space-y-3"
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-relaxed">
                    {q.question}
                  </span>
                  <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 shrink-0 font-mono bg-neutral-100 dark:bg-neutral-800 border border-border-custom px-1.5 py-0.5 rounded">
                    <Clock size={9} />
                    <span>{q.scheduleDay} at {q.scheduleTime}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <textarea
                    placeholder="Write your answer..."
                    value={answerDrafts[q.id] || ""}
                    onChange={(e) => setAnswerDrafts({ ...answerDrafts, [q.id]: e.target.value })}
                    rows={2}
                    className="flex-1 text-xs bg-surface border border-border-custom rounded-lg p-2 focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-neutral-100"
                  />
                  <button
                    onClick={() => handleSubmitAnswer(q.id)}
                    disabled={submittingAnswers[q.id] || !(answerDrafts[q.id] || "").trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold self-end flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {submittingAnswers[q.id] ? "Posting..." : <><Check size={12} /> Submit</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex justify-between items-center shrink-0 border-b border-border-custom pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("feed")}
            className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all ${
              activeTab === "feed"
                ? "border-foreground text-foreground"
                : "border-transparent text-neutral-500 hover:text-foreground"
            }`}
          >
            Answers Feed ({allAnswers.length})
          </button>
          {!isClient && (
            <button
              onClick={() => setActiveTab("manage")}
              className={`text-xs font-bold uppercase tracking-wider pb-1.5 border-b-2 transition-all ${
                activeTab === "manage"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-neutral-500 hover:text-foreground"
              }`}
            >
              Configure Check-ins ({questions.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "feed" ? (
          <div className="space-y-6 max-w-3xl">
            {allAnswers.length > 0 ? (
              allAnswers.map((ans) => (
                <div 
                  key={ans.id}
                  className="bg-surface border border-border-custom rounded-xl p-5 space-y-3.5 shadow-xs transition-all hover:border-neutral-350 dark:hover:border-neutral-700"
                >
                  {/* Question Reference */}
                  <div className="flex items-center gap-2 border-b border-border-custom pb-2.5">
                    <HelpCircle size={14} className="text-neutral-400 shrink-0" />
                    <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">
                      Check-in question
                    </span>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      "{ans.questionText}"
                    </span>
                  </div>

                  {/* User Profile & Answer */}
                  <div className="flex gap-3">
                    {ans.user.avatarUrl ? (
                      <img
                        src={ans.user.avatarUrl}
                        alt={ans.user.name}
                        className="w-8 h-8 rounded-full bg-neutral-150 border border-border-custom shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center border border-border-custom shrink-0">
                        <User size={14} className="text-neutral-500" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                          {ans.user.name}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-mono">
                          {new Date(ans.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed whitespace-pre-wrap">
                        {ans.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-surface border border-border-custom rounded-xl p-6">
                <HelpCircle size={24} className="text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-400 italic">
                  No answers submitted yet. Setup a check-in question to gather updates from the team.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Manage Panel */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create form (Col-Span 1) */}
            <div className="md:col-span-1 bg-surface border border-border-custom p-5 rounded-xl space-y-4 h-fit">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Plus size={14} />
                <span>New Auto Check-in</span>
              </h3>

              <form onSubmit={handleCreateQuestion} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                    Question Text
                  </label>
                  <textarea
                    placeholder="e.g. What did you accomplish this week?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    required
                    rows={3}
                    className="w-full text-xs bg-surface border border-border-custom rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      Day
                    </label>
                    <select
                      value={newDay}
                      onChange={(e) => setNewDay(e.target.value)}
                      className="w-full text-xs bg-surface border border-border-custom rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-neutral-750"
                    >
                      {daysOfWeek.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      required
                      className="w-full text-xs bg-surface border border-border-custom rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-neutral-750"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingQuestion || !newQuestion.trim()}
                  className="w-full bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg py-2 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmittingQuestion ? "Creating..." : "Schedule Check-in"}
                </button>
              </form>
            </div>

            {/* List and manage (Col-Span 2) */}
            <div className="md:col-span-2 space-y-4">
              {questions.length > 0 ? (
                questions.map((q) => (
                  <div 
                    key={q.id}
                    className={`bg-surface border p-4 rounded-xl flex items-center justify-between gap-4 transition-all ${
                      q.active 
                        ? "border-border-custom" 
                        : "border-neutral-200 dark:border-neutral-800 opacity-60"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
                        {q.question}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{q.scheduleDay}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{q.scheduleTime}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} />
                          <span>{q.answers.length} answers</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active/Inactive toggle */}
                      <button
                        onClick={() => handleToggleActive(q.id, q.active)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                          q.active
                            ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-750 border-emerald-100 hover:bg-emerald-100"
                            : "bg-neutral-50 dark:bg-neutral-850 text-neutral-450 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        {q.active ? "Active" : "Paused"}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-850 rounded-lg transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-surface border border-border-custom rounded-xl p-6">
                  <HelpCircle size={24} className="text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 italic">
                    No check-in questions configured. Add one on the left to start collecting recurring updates.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
