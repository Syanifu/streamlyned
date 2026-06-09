import { db } from "./db";
import { differenceInDays, isToday, isBefore, startOfDay } from "date-fns";

export interface TodayItem {
  id: string;
  type: "task" | "discussion";
  title: string;
  projectName: string;
  projectId: string;
  targetUrl: string;
  rankDriver: string;
  dueDate: Date | null;
  isCompleted: boolean;
  updatedAt: Date;
  priority: string;
}

export async function getTodayViewData(
  userId: string,
  workspaceId: string
): Promise<TodayItem[]> {
  const items: TodayItem[] = [];

  // 1 & 2. Fetch uncompleted tasks and subscribed discussions in parallel
  const [assignedTasks, subscribedDiscussions] = await Promise.all([
    db.task.findMany({
      where: {
        workspaceId,
        isCompleted: false,
        assignees: {
          some: {
            userId,
          },
        },
      },
      include: {
        taskList: {
          include: {
            project: true,
          },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
      },
    }),
    db.discussionSubscription.findMany({
      where: {
        userId,
        discussion: {
          workspaceId,
        },
      },
      include: {
        discussion: {
          include: {
            project: true,
            comments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    })
  ]);

  const now = new Date();
  const today = startOfDay(now);

  for (const task of assignedTasks) {
    let rankDriver = "Assigned to you";
    let score = 10; // lower score is less urgent

    const project = task.taskList.project;

    // Check due dates
    if (task.dueDateEnd) {
      const dueEnd = startOfDay(new Date(task.dueDateEnd));
      const daysDiff = differenceInDays(dueEnd, today);

      if (isToday(dueEnd)) {
        rankDriver = "due today";
        score = 100;
      } else if (isBefore(dueEnd, today)) {
        rankDriver = `overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? "s" : ""}`;
        score = 120;
      } else if (daysDiff <= 1) {
        rankDriver = "due tomorrow";
        score = 90;
      } else if (daysDiff <= 3) {
        rankDriver = `due in ${daysDiff} days`;
        score = 70;
      } else {
        rankDriver = `due ${dueEnd.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
        score = 40;
      }
    }

    // Check if client commented last
    const lastComment = task.comments[0];
    if (lastComment && lastComment.isClientComment) {
      rankDriver = "client follow-up overdue";
      score += 30; // boost urgency
    }

    // If task is in In Progress, slight boost
    if (task.taskList.name.toLowerCase() === "in progress") {
      score += 10;
    }

    items.push({
      id: `task-${task.id}`,
      type: "task",
      title: task.title,
      projectName: project.name,
      projectId: project.id,
      targetUrl: `/dashboard/projects/${project.id}?tab=tasks&task=${task.id}`,
      rankDriver,
      dueDate: task.dueDateEnd,
      isCompleted: task.isCompleted,
      updatedAt: task.updatedAt,
      priority: task.priority,
    });
  }

  for (const sub of subscribedDiscussions) {
    const d = sub.discussion;
    // Only show if updated recently (e.g. in last 7 days)
    const lastComment = d.comments[0];
    const updateTime = lastComment ? lastComment.createdAt : d.updatedAt;
    
    // Skip if older than 7 days to keep Today clean
    const daysSinceUpdate = differenceInDays(now, updateTime);
    if (daysSinceUpdate > 7) {
      continue;
    }

    let rankDriver = "subscribed discussion";
    if (lastComment) {
      if (lastComment.userId !== userId) {
        rankDriver = "new reply in thread";
      }
    }

    items.push({
      id: `discussion-${d.id}`,
      type: "discussion",
      title: d.title,
      projectName: d.project.name,
      projectId: d.project.id,
      targetUrl: `/dashboard/projects/${d.project.id}?tab=discussions&id=${d.id}`,
      rankDriver,
      dueDate: null,
      isCompleted: false,
      updatedAt: updateTime,
      priority: "P4",
    });
  }

  return items;
}
