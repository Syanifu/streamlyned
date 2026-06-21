import json
from datetime import datetime, timezone
from langchain.tools import tool
from db import query, execute


@tool
def get_projects(workspace_id: str) -> str:
    """Get all active projects in the workspace with their status and basic stats."""
    rows = query(
        """
        SELECT
            p.id,
            p.name,
            p.description,
            p."isArchived",
            p."createdAt",
            COUNT(DISTINCT pm."userId") AS member_count,
            COUNT(DISTINCT t.id) FILTER (WHERE t."isCompleted" = false) AS open_tasks,
            COUNT(DISTINCT t.id) FILTER (WHERE t."isCompleted" = true) AS done_tasks,
            COUNT(DISTINCT t.id) FILTER (
                WHERE t."isCompleted" = false
                AND t."dueDateEnd" IS NOT NULL
                AND t."dueDateEnd" < NOW()
            ) AS overdue_tasks
        FROM "Project" p
        LEFT JOIN "ProjectMember" pm ON pm."projectId" = p.id
        LEFT JOIN "TaskList" tl ON tl."projectId" = p.id
        LEFT JOIN "Task" t ON t."taskListId" = tl.id
        WHERE p."workspaceId" = %s
          AND p."deletedAt" IS NULL
        GROUP BY p.id
        ORDER BY p."createdAt" DESC
        """,
        (workspace_id,),
    )
    if not rows:
        return "No projects found in this workspace."

    result = []
    for r in rows:
        status = "Archived" if r["isArchived"] else ("At Risk" if r["overdue_tasks"] > 0 else "Healthy")
        result.append(
            f"• [{status}] {r['name']} (ID: {r['id']})\n"
            f"  Members: {r['member_count']} | Open tasks: {r['open_tasks']} | "
            f"Done: {r['done_tasks']} | Overdue: {r['overdue_tasks']}\n"
            f"  Description: {r['description'] or 'No description'}"
        )
    return "\n\n".join(result)


@tool
def get_tasks(project_id: str, include_completed: bool = False) -> str:
    """Get tasks for a specific project. Set include_completed=True to include finished tasks."""
    filter_clause = "" if include_completed else 'AND t."isCompleted" = false'
    rows = query(
        f"""
        SELECT
            t.id,
            t.title,
            t.description,
            t.priority,
            t."isCompleted",
            t."dueDateEnd",
            tl.name AS list_name,
            u.name AS assignee
        FROM "Task" t
        JOIN "TaskList" tl ON tl.id = t."taskListId"
        LEFT JOIN "User" u ON u.id = t."assignedToId"
        WHERE tl."projectId" = %s
        {filter_clause}
        ORDER BY
            CASE t.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
            t."createdAt" DESC
        """,
        (project_id,),
    )
    if not rows:
        return "No tasks found for this project."

    result = []
    for r in rows:
        due = r["dueDateEnd"].strftime("%Y-%m-%d") if r["dueDateEnd"] else "No due date"
        done = "✓" if r["isCompleted"] else "○"
        overdue = ""
        if not r["isCompleted"] and r["dueDateEnd"] and r["dueDateEnd"] < datetime.now(timezone.utc):
            overdue = " ⚠ OVERDUE"
        result.append(
            f"{done} [{r['priority'] or '—'}] {r['title']}{overdue}\n"
            f"   List: {r['list_name']} | Assignee: {r['assignee'] or 'Unassigned'} | Due: {due}"
        )
    return "\n".join(result)


@tool
def get_project_members(project_id: str) -> str:
    """Get all members of a specific project with their roles."""
    rows = query(
        """
        SELECT u.name, u.email, pm.role, pm."visibleTools"
        FROM "ProjectMember" pm
        JOIN "User" u ON u.id = pm."userId"
        WHERE pm."projectId" = %s
        ORDER BY pm.role, u.name
        """,
        (project_id,),
    )
    if not rows:
        return "No members found for this project."

    return "\n".join(
        f"• {r['name']} ({r['email']}) — Role: {r['role']}" for r in rows
    )


@tool
def create_task(
    project_id: str,
    title: str,
    description: str = "",
    priority: str = "P3",
    due_date: str = "",
) -> str:
    """
    Create a new task in a project.
    priority must be one of: P1, P2, P3, P4.
    due_date format: YYYY-MM-DD (optional).
    Returns the new task ID on success.
    """
    # Find the first task list in the project
    lists = query(
        'SELECT id FROM "TaskList" WHERE "projectId" = %s ORDER BY "order" ASC LIMIT 1',
        (project_id,),
    )
    if not lists:
        return f"Cannot create task: no task lists found in project {project_id}."

    task_list_id = lists[0]["id"]

    # Parse due date
    due_dt = None
    if due_date:
        try:
            due_dt = datetime.strptime(due_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return f"Invalid due_date format '{due_date}'. Use YYYY-MM-DD."

    valid_priorities = {"P1", "P2", "P3", "P4"}
    if priority not in valid_priorities:
        priority = "P3"

    import uuid
    task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    execute(
        """
        INSERT INTO "Task" (
            id, title, description, priority, "isCompleted",
            "taskListId", "dueDateEnd", "createdAt", "updatedAt"
        ) VALUES (%s, %s, %s, %s, false, %s, %s, %s, %s)
        """,
        (task_id, title, description, priority, task_list_id, due_dt, now, now),
    )

    return f"Task created successfully! ID: {task_id} | Title: '{title}' | Priority: {priority}"


@tool
def summarize_meeting_notes(notes: str, project_id: str = "") -> str:
    """
    Summarize meeting notes and extract action items, decisions, and deadlines.
    Optionally pass a project_id to include project context.
    """
    context = ""
    if project_id:
        projects = query('SELECT name, description FROM "Project" WHERE id = %s', (project_id,))
        if projects:
            context = f"Project: {projects[0]['name']}\n"

    # Return a structured prompt result — the LLM will handle the actual summarization
    return f"""
{context}Please summarize the following meeting notes. Extract:
1. Key decisions made
2. Action items (who does what by when)
3. Important deadlines or dates mentioned
4. Open questions or blockers

Meeting Notes:
{notes}
"""


@tool
def get_workspace_summary(workspace_id: str) -> str:
    """Get a high-level summary of the entire workspace — projects, members, and task health."""
    projects = query(
        """
        SELECT COUNT(*) AS total,
               COUNT(*) FILTER (WHERE "isArchived" = false AND "deletedAt" IS NULL) AS active
        FROM "Project" WHERE "workspaceId" = %s
        """,
        (workspace_id,),
    )
    members = query(
        'SELECT COUNT(*) AS total FROM "WorkspaceMember" WHERE "workspaceId" = %s',
        (workspace_id,),
    )
    tasks = query(
        """
        SELECT
            COUNT(*) FILTER (WHERE t."isCompleted" = false) AS open,
            COUNT(*) FILTER (WHERE t."isCompleted" = true) AS done,
            COUNT(*) FILTER (
                WHERE t."isCompleted" = false
                AND t."dueDateEnd" IS NOT NULL
                AND t."dueDateEnd" < NOW()
            ) AS overdue
        FROM "Task" t
        JOIN "TaskList" tl ON tl.id = t."taskListId"
        JOIN "Project" p ON p.id = tl."projectId"
        WHERE p."workspaceId" = %s AND p."deletedAt" IS NULL
        """,
        (workspace_id,),
    )

    p = projects[0] if projects else {}
    m = members[0] if members else {}
    t = tasks[0] if tasks else {}

    return (
        f"Workspace Overview:\n"
        f"  Projects: {p.get('active', 0)} active / {p.get('total', 0)} total\n"
        f"  Members:  {m.get('total', 0)}\n"
        f"  Tasks:    {t.get('open', 0)} open | {t.get('done', 0)} done | {t.get('overdue', 0)} overdue"
    )
