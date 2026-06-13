"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  createTaskAction, 
  updateTaskAction, 
  moveTaskAction, 
  addCommentAction 
} from "@/app/actions/tasks";
import { 
  Plus, 
  Calendar, 
  User, 
  CheckSquare, 
  Square, 
  X, 
  MessageSquare, 
  History, 
  Send,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { reassignTaskAction } from "@/app/actions/nudges";
import { toast } from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface UserCompact {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface TaskComment {
  id: string;
  content: string;
  isClientComment: boolean;
  createdAt: Date;
  user: UserCompact;
}

interface TaskHistoryItem {
  id: string;
  action: string;
  description: string;
  createdAt: Date;
  user: UserCompact;
  priority?: string;
}

interface TaskCompact {
  id: string;
  title: string;
  notes: string | null;
  dueDateEnd: Date | null;
  isCompleted: boolean;
  completedAt: Date | null;
  position: number;
  visibleToClients: boolean;
  assignees: { user: UserCompact }[];
  comments: any[];
  priority: string;
}

export const PRIORITY_MAP: Record<string, { label: string; color: string; bg: string; border: string; text: string; dot: string; icon: string }> = {
  P1: { label: "P1 — Critical", color: "red", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-500", text: "text-red-850 dark:text-red-300", dot: "bg-red-500", icon: "🔴" },
  P2: { label: "P2 — High", color: "orange", bg: "bg-orange-50 dark:bg-orange-950/20", border: "border-orange-500", text: "text-orange-850 dark:text-orange-300", dot: "bg-orange-500", icon: "🟠" },
  P3: { label: "P3 — Medium", color: "yellow", bg: "bg-yellow-50 dark:bg-yellow-950/20", border: "border-yellow-500", text: "text-yellow-850 dark:text-yellow-350", dot: "bg-yellow-500", icon: "🟡" },
  P4: { label: "P4 — Normal", color: "green", bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-500", text: "text-green-800 dark:text-green-300", dot: "bg-green-500", icon: "🟢" },
  P5: { label: "P5 — Low", color: "blue", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-500", text: "text-blue-800 dark:text-blue-300", dot: "bg-blue-500", icon: "🔵" },
  P6: { label: "P6 — Archived", color: "grey", bg: "bg-neutral-50 dark:bg-neutral-900/30", border: "border-neutral-400 dark:border-neutral-600", text: "text-neutral-500 dark:text-neutral-400", dot: "bg-neutral-400 dark:bg-neutral-600", icon: "⚪" },
};

interface ListCompact {
  id: string;
  name: string;
  tasks: TaskCompact[];
}

interface TasksTabProps {
  projectId: string;
  selectedTaskId?: string;
  workspaceUsers: UserCompact[];
  currentUser: any;
  isClient: boolean;
  lists: ListCompact[];
  selectedTaskDetails: any; // Task + comments + assignees + visibleToClients
  taskHistory: TaskHistoryItem[];
}

// 1. Kanban Column Component (Droppable)
function KanbanColumn({ list, children }: { list: ListCompact; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: list.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-surface/50 border border-border-custom rounded-xl p-4 min-h-[300px] overflow-hidden"
    >
      {children}
    </div>
  );
}

// 2. Sortable Task Card Component (Sortable)
interface SortableTaskCardProps {
  task: TaskCompact;
  isOverdue: boolean;
  isClient: boolean;
  openDrawer: (task: TaskCompact) => void;
  handleToggleComplete: (task: TaskCompact) => void;
}

function SortableTaskCard({
  task,
  isOverdue,
  isClient,
  openDrawer,
  handleToggleComplete,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isClient, // Disable dragging for Client accounts
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => openDrawer(task)}
      className={`relative overflow-hidden pt-4 p-3 bg-surface border border-border-custom hover:border-neutral-400 dark:hover:border-neutral-600 rounded-lg shadow-sm flex flex-col gap-2 transition-all select-none ${
        isClient ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${!task.visibleToClients ? "border-dashed border-amber-300 dark:border-amber-900" : ""}`}
    >
      {/* Top bar accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${PRIORITY_MAP[task.priority]?.dot || 'bg-neutral-200'}`} />

      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete(task);
          }}
          disabled={isClient}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {task.isCompleted ? (
            <CheckSquare size={15} className="text-brand-success" />
          ) : (
            <Square size={15} />
          )}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-tight block truncate ${
              task.isCompleted ? "line-through text-neutral-400 dark:text-neutral-500" : ""
            }`}
          >
            {task.title}
          </span>
        </div>
      </div>

      {/* Metadata Row */}
      {(task.dueDateEnd || task.assignees.length > 0 || task.comments.length > 0 || !task.visibleToClients) && (
        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5">
            {task.dueDateEnd && (
              <span
                className={`text-[9px] flex items-center gap-1 font-medium px-1.5 py-0.2 rounded ${
                  isOverdue
                    ? "bg-red-50 dark:bg-red-950/20 text-brand-danger border border-red-100 dark:border-red-900/50"
                    : "bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                <Calendar size={10} />
                <span>
                  {new Date(task.dueDateEnd).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </span>
            )}
            {task.comments.length > 0 && (
              <span className="text-[9px] flex items-center gap-1 text-neutral-400">
                <MessageSquare size={10} />
                <span>{task.comments.length}</span>
              </span>
            )}
            {!isClient && !task.visibleToClients && (
              <span
                className="text-[9px] flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 px-1.5 py-0.2 rounded font-medium"
                title="Private to team (Hidden from clients)"
              >
                <EyeOff size={10} />
                <span>Private</span>
              </span>
            )}
          </div>

          {/* Assignee Avatar */}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1 overflow-hidden">
              {task.assignees.map(({ user }) => (
                <img
                  key={user.id}
                  src={user.avatarUrl || ""}
                  alt={user.name}
                  title={user.name}
                  className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-neutral-900 bg-neutral-200"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 3. Main TasksTab Component
export default function TasksTab({
  projectId,
  selectedTaskId,
  workspaceUsers,
  currentUser,
  isClient,
  lists = [],
  selectedTaskDetails = null,
  taskHistory = [],
}: TasksTabProps) {
  const router = useRouter();
  const [activeAddListId, setActiveAddListId] = useState<string | null>(null);

  // Form States
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDueDateText, setNewDueDateText] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDateText, setEditDueDateText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [showReassign, setShowReassign] = useState(false);
  const [reassignUserId, setReassignUserId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [editPriority, setEditPriority] = useState("P4");

  const isStuck = !!(selectedTaskDetails && !selectedTaskDetails.isCompleted && 
    (new Date().getTime() - new Date(selectedTaskDetails.createdAt).getTime() > 5 * 24 * 60 * 60 * 1000));

  // Configure sensors for dnd-kit to prevent click conflicts on inputs/checkboxes
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Handle Drag & Drop completion
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || isClient) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find active task details
    let activeTask: TaskCompact | null = null;
    for (const list of lists) {
      const task = list.tasks.find((t) => t.id === activeId);
      if (task) {
        activeTask = task;
        break;
      }
    }
    if (!activeTask) return;

    // Determine target list and task index
    let targetListId = "";
    let targetIndex = -1;

    const destList = lists.find((l) => l.id === overId);
    if (destList) {
      targetListId = destList.id;
      targetIndex = destList.tasks.length;
    } else {
      for (const list of lists) {
        const idx = list.tasks.findIndex((t) => t.id === overId);
        if (idx !== -1) {
          targetListId = list.id;
          targetIndex = idx;
          break;
        }
      }
    }

    if (!targetListId) return;

    const targetList = lists.find((l) => l.id === targetListId)!;
    const targetTasks = targetList.tasks.filter((t) => t.id !== activeId);

    let newPosition = 1000.0;
    if (targetTasks.length === 0) {
      newPosition = 1000.0;
    } else if (targetIndex <= 0) {
      newPosition = targetTasks[0].position / 2.0;
    } else if (targetIndex >= targetTasks.length) {
      newPosition = targetTasks[targetTasks.length - 1].position + 1000.0;
    } else {
      newPosition = (targetTasks[targetIndex - 1].position + targetTasks[targetIndex].position) / 2.0;
    }

    await moveTaskAction(projectId, activeId, targetListId, newPosition);
    router.refresh();
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent, listId: string) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);

    const assignees = newAssigneeId ? [newAssigneeId] : [];
    const res = await createTaskAction(
      projectId,
      listId,
      newTitle,
      newNotes,
      newDueDateText,
      assignees
    );

    if (res.success) {
      setNewTitle("");
      setNewNotes("");
      setNewDueDateText("");
      setNewAssigneeId("");
      setActiveAddListId(null);
      router.refresh();
    } else {
      alert(res.error || "Failed to create task");
    }
    setIsCreating(false);
  };

  // Toggle Complete
  const handleToggleComplete = async (task: TaskCompact) => {
    await updateTaskAction(projectId, task.id, {
      isCompleted: !task.isCompleted,
    });
    router.refresh();
  };

  // Submit Task Edit
  const handleUpdateTaskDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetails || !editTitle.trim()) return;
    setIsUpdating(true);

    const res = await updateTaskAction(projectId, selectedTaskDetails.id, {
      title: editTitle,
      notes: editNotes,
      dueDateText: editDueDateText || null,
      priority: editPriority,
    });

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to update task");
    }
    setIsUpdating(false);
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskDetails || !reassignUserId || isReassigning) return;

    setIsReassigning(true);
    const res = await reassignTaskAction(selectedTaskDetails.id, reassignUserId, projectId);
    setIsReassigning(false);

    if (res.success) {
      toast.success("Task reassigned successfully!");
      setShowReassign(false);
      setReassignUserId("");
      closeDrawer();
      router.refresh();
    } else {
      toast.error(res.error || "Failed to reassign task");
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTaskId) return;
    setIsCommenting(true);

    const res = await addCommentAction(
      projectId,
      selectedTaskId,
      commentText
    );

    if (res.success) {
      setCommentText("");
      router.refresh();
    } else {
      alert(res.error || "Failed to add comment");
    }
    setIsCommenting(false);
  };

  // Open Details Drawer
  const openDrawer = (task: TaskCompact) => {
    setEditTitle(task.title);
    setEditNotes(task.notes || "");
    setEditDueDateText(task.dueDateEnd ? new Date(task.dueDateEnd).toLocaleDateString() : "");
    setEditPriority(task.priority || "P4");
    router.push(`/dashboard/projects/${projectId}?tab=tasks&task=${task.id}`);
  };

  const closeDrawer = () => {
    router.push(`/dashboard/projects/${projectId}?tab=tasks`);
  };

  return (
    <div className="flex-1 flex gap-6 overflow-hidden relative min-h-0">
      {/* Kanban Board Container */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
          {lists.map((list) => (
            <KanbanColumn key={list.id} list={list}>
              {/* List Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {list.name}
                </h3>
                <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.2 rounded-full font-mono">
                  {list.tasks.length}
                </span>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                <SortableContext items={list.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {list.tasks.map((task) => {
                    const isOverdue = !!(task.dueDateEnd && new Date(task.dueDateEnd) < new Date() && !task.isCompleted);
                    return (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        isOverdue={isOverdue}
                        isClient={isClient}
                        openDrawer={openDrawer}
                        handleToggleComplete={handleToggleComplete}
                      />
                    );
                  })}
                </SortableContext>
              </div>

              {/* Add Task Button & Form */}
              {!isClient && (
                activeAddListId === list.id ? (
                  <form
                    onSubmit={(e) => handleCreateTask(e, list.id)}
                    className="bg-surface border border-border-custom p-3 rounded-lg space-y-2.5 shrink-0"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Task title..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
                    />
                    <textarea
                      placeholder="Notes (optional)..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      rows={2}
                      className="w-full text-xs px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400 resize-none text-neutral-800 dark:text-neutral-200"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Due (e.g. next Tuesday)..."
                        value={newDueDateText}
                        onChange={(e) => setNewDueDateText(e.target.value)}
                        className="w-1/2 text-[10px] px-2.5 py-1.5 border border-border-custom bg-transparent rounded focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
                      />
                      <select
                        value={newAssigneeId}
                        onChange={(e) => setNewAssigneeId(e.target.value)}
                        className="w-1/2 text-[10px] px-2 py-1.5 border border-border-custom bg-surface rounded focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200"
                      >
                        <option value="">Assignee...</option>
                        {workspaceUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveAddListId(null)}
                        className="px-2.5 py-1 border border-border-custom text-neutral-500 rounded text-[10px] hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating || !newTitle.trim()}
                        className="px-2.5 py-1 bg-neutral-900 dark:bg-neutral-800 text-white rounded text-[10px] hover:bg-neutral-800 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setActiveAddListId(list.id)}
                    className="w-full py-1.5 border border-dashed border-border-custom hover:border-neutral-400 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-xs flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Plus size={13} />
                    <span>Add Task</span>
                  </button>
                )
              )}
            </KanbanColumn>
          ))}
        </div>
      </DndContext>

      {/* Details Drawer Sheet */}
      {selectedTaskId && selectedTaskDetails && (
        <div className="w-[450px] border-l border-border-custom bg-surface flex flex-col justify-between shrink-0 overflow-y-auto h-full p-6 animate-in slide-in-from-right duration-200">
          <div className="space-y-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border-custom pb-3">
              <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                Task Details
              </span>
              <button
                onClick={closeDrawer}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X size={15} />
              </button>
            </div>

            {/* Client mode visibility switch */}
            {!isClient && (
              <div className="p-3 bg-amber-50/20 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/40 rounded-lg flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    {selectedTaskDetails.visibleToClients ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>Visible to Client</span>
                  </span>
                  <p className="text-[10px] text-neutral-400">
                    {selectedTaskDetails.visibleToClients 
                      ? "Clients invited to this project can view this task card." 
                      : "Only workspace team members can view this task card."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await updateTaskAction(projectId, selectedTaskDetails.id, {
                      visibleToClients: !selectedTaskDetails.visibleToClients,
                    });
                    router.refresh();
                  }}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center shrink-0 ${
                    selectedTaskDetails.visibleToClients ? "bg-brand-success" : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                >
                  <span
                    className={`w-4 h-4 bg-white rounded-full shadow absolute transition-all ${
                      selectedTaskDetails.visibleToClients ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Stuck Task Warning */}
            {!isClient && isStuck && (
              <div className="p-4 bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-900/40 rounded-xl space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div className="space-y-1">
                    <span className="font-semibold text-red-800 dark:text-red-200 text-xs">
                      This task looks stuck!
                    </span>
                    <p className="text-[10px] text-red-700/80 dark:text-red-300/80 leading-relaxed">
                      It was created over 5 days ago and is still incomplete. Consider reassigning it to help get it done.
                    </p>
                  </div>
                </div>

                {!showReassign ? (
                  <button
                    type="button"
                    onClick={() => setShowReassign(true)}
                    className="w-full text-center py-1.5 px-3 bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:hover:bg-red-800 text-white rounded-lg text-[10px] font-semibold transition-colors duration-150"
                  >
                    Reassign Task
                  </button>
                ) : (
                  <form onSubmit={handleReassign} className="space-y-2.5 pt-1">
                    <div className="flex gap-2">
                      <select
                        value={reassignUserId}
                        onChange={(e) => setReassignUserId(e.target.value)}
                        required
                        className="flex-1 text-[10px] px-2.5 py-1.5 border border-red-500/20 bg-surface dark:bg-neutral-900 rounded-lg focus:outline-none focus:border-red-500 text-neutral-800 dark:text-neutral-200"
                      >
                        <option value="">Choose new assignee...</option>
                        {workspaceUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isReassigning || !reassignUserId}
                        className="px-3 py-1.5 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-lg text-[10px] font-semibold disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReassign(false);
                        setReassignUserId("");
                      }}
                      className="text-[9px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 block font-medium"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Quick Actions (Complete) */}
            <button
              onClick={() => handleToggleComplete(selectedTaskDetails)}
              disabled={isClient}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-border-custom disabled:opacity-50"
            >
              {selectedTaskDetails.isCompleted ? (
                <>
                  <CheckSquare size={14} className="text-brand-success" />
                  <span>Mark Incomplete</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-neutral-400" />
                  <span>Mark Completed</span>
                </>
              )}
            </button>

            {/* Edit Form */}
            <form onSubmit={handleUpdateTaskDetails} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  disabled={isClient}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent text-neutral-800 dark:text-neutral-200 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Notes
                </label>
                <textarea
                  disabled={isClient}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent resize-none leading-relaxed text-neutral-800 dark:text-neutral-200 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Due Date
                </label>
                <input
                  type="text"
                  disabled={isClient}
                  placeholder="e.g. next Tuesday or MM/DD/YYYY"
                  value={editDueDateText}
                  onChange={(e) => setEditDueDateText(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200 disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Priority
                </label>
                <select
                  disabled={isClient}
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-border-custom bg-surface dark:bg-neutral-900 rounded-lg focus:outline-none focus:border-brand-accent text-neutral-850 dark:text-neutral-200 disabled:opacity-60 font-semibold"
                >
                  {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.icon} {val.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isClient && (
                <button
                  type="submit"
                  disabled={isUpdating || !editTitle.trim()}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium px-4 py-2 disabled:opacity-50"
                >
                  Save Updates
                </button>
              )}
            </form>

            {/* Comments Stream */}
            <div className="border-t border-border-custom pt-6 space-y-4">
              <h4 className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Comments
              </h4>

              {/* Add Comment Inline */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-border-custom bg-transparent rounded-lg focus:outline-none focus:border-brand-accent placeholder-neutral-400 text-neutral-800 dark:text-neutral-200"
                />
                <button
                  type="submit"
                  disabled={isCommenting || !commentText.trim()}
                  className="p-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 shrink-0"
                >
                  <Send size={13} />
                </button>
              </form>

              {/* List Comments */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedTaskDetails.comments.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic">No comments yet</p>
                ) : (
                  selectedTaskDetails.comments.map((c: TaskComment) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-lg border text-xs ${
                        c.isClientComment
                          ? "bg-amber-50/30 border-l-4 border-l-amber-500 border-amber-100"
                          : "bg-neutral-50/50 dark:bg-neutral-900/30 border-border-custom"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{c.user.name}</span>
                          {c.isClientComment && (
                            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[8px] font-bold px-1 rounded">
                              Client
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-neutral-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-350 leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Task Change History (Audit Log) */}
            <div className="border-t border-border-custom pt-6 space-y-3">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <History size={12} />
                <h4 className="text-[10px] font-semibold uppercase tracking-wider">
                  Task History
                </h4>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-[11px]">
                {taskHistory.length === 0 ? (
                  <p className="text-neutral-400 italic">No history logged</p>
                ) : (
                  taskHistory.map((h) => {
                    const icon = h.priority ? PRIORITY_MAP[h.priority]?.icon : "";
                    return (
                      <div key={h.id} className="flex items-center gap-1.5 text-neutral-500">
                        {icon && <span title={h.priority} className="text-[10px] shrink-0">{icon}</span>}
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 shrink-0">
                          {h.user.name.split(" ")[0]}:
                        </span>
                        <span className="flex-1 text-neutral-600 dark:text-neutral-400">{h.description}</span>
                        <span className="text-[9px] text-neutral-400 shrink-0 font-mono">
                          {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
