import JSZip from "jszip";

export interface BCPerson {
  id: number;
  name: string;
  email_address: string;
}

export interface BCTodo {
  id: number;
  title: string;
  description?: string;
  due_on?: string | null;
  completed: boolean;
  completed_at?: string | null;
  assignees: BCPerson[];
  position?: number;
}

export interface BCTodoList {
  id: number;
  name: string;
  description?: string;
  todos: {
    completed: BCTodo[];
    remaining: BCTodo[];
  };
}

export interface BCComment {
  id: number;
  content: string;
  creator: BCPerson;
  created_at: string;
}

export interface BCMessage {
  id: number;
  subject: string;
  content: string;
  creator: BCPerson;
  created_at: string;
  comments?: BCComment[];
}

export interface BCDoc {
  id: number;
  title: string;
  content: string;
  creator: BCPerson;
  created_at: string;
}

export interface ParsedBCProject {
  id: number | string;
  name: string;
  description: string;
  todoLists: BCTodoList[];
  messages: BCMessage[];
  docs: BCDoc[];
}

export interface BasecampPreview {
  projects: ParsedBCProject[];
  allPeople: BCPerson[];
  stats: {
    projectCount: number;
    taskListCount: number;
    taskCount: number;
    messageCount: number;
    docCount: number;
    peopleCount: number;
  };
}

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectPerson(person: BCPerson | undefined, map: Map<string, BCPerson>) {
  if (!person?.email_address) return;
  if (!map.has(person.email_address)) map.set(person.email_address, person);
}

export async function parseBasecampZip(buffer: Buffer): Promise<BasecampPreview> {
  const zip = await JSZip.loadAsync(buffer);

  // Load all JSON files
  const jsonFiles: Record<string, any> = {};
  await Promise.all(
    Object.entries(zip.files).map(async ([path, file]) => {
      if (file.dir || !path.endsWith(".json")) return;
      try {
        const text = await file.async("text");
        jsonFiles[path] = JSON.parse(text);
      } catch {
        // skip malformed
      }
    })
  );

  const peopleMap = new Map<string, BCPerson>();
  const projects: ParsedBCProject[] = [];

  // Each project.json defines a project root
  const projectJsonPaths = Object.keys(jsonFiles).filter((p) =>
    p.endsWith("/project.json")
  );

  for (const projectJsonPath of projectJsonPaths) {
    const projectData = jsonFiles[projectJsonPath];
    if (!projectData?.name) continue;

    const projectDir = projectJsonPath.substring(
      0,
      projectJsonPath.lastIndexOf("/") + 1
    );

    // Collect all JSON files under this project directory
    const projectFiles: Record<string, any> = {};
    for (const [path, data] of Object.entries(jsonFiles)) {
      if (path.startsWith(projectDir) && path !== projectJsonPath) {
        projectFiles[path.substring(projectDir.length)] = data;
      }
    }

    const parsed: ParsedBCProject = {
      id: projectData.id || projectDir,
      name: projectData.name,
      description: stripHtml(projectData.description || ""),
      todoLists: [],
      messages: [],
      docs: [],
    };

    // Messages — Basecamp 3 puts these in message_board/message_board.json
    const msgBoard =
      projectFiles["message_board.json"] ||
      projectFiles["message_board/message_board.json"];

    if (msgBoard) {
      const messages = Array.isArray(msgBoard)
        ? msgBoard
        : msgBoard.messages || [];
      for (const msg of messages) {
        parsed.messages.push({
          ...msg,
          content: stripHtml(msg.content || ""),
          comments: (msg.comments || []).map((c: BCComment) => ({
            ...c,
            content: stripHtml(c.content || ""),
          })),
        });
        collectPerson(msg.creator, peopleMap);
        for (const c of msg.comments || []) collectPerson(c.creator, peopleMap);
      }
    }

    // Todo lists — todos/todo_list-{id}/todo_list.json or todolists/{id}.json
    for (const [relPath, data] of Object.entries(projectFiles)) {
      const isTodoList =
        (relPath.startsWith("todos/") && relPath.endsWith("/todo_list.json")) ||
        (relPath.startsWith("todolists/") &&
          relPath.endsWith(".json") &&
          relPath.split("/").length === 2);

      if (!isTodoList) continue;

      const remaining: BCTodo[] = data.todos?.remaining || data.remaining || [];
      const completed: BCTodo[] = data.todos?.completed || data.completed || [];

      parsed.todoLists.push({
        id: data.id,
        name: data.name || "Tasks",
        description: stripHtml(data.description || ""),
        todos: { remaining, completed },
      });

      for (const todo of [...remaining, ...completed]) {
        for (const assignee of todo.assignees || [])
          collectPerson(assignee, peopleMap);
      }
    }

    // Docs — vault/vault.json
    const vault =
      projectFiles["vault.json"] || projectFiles["vault/vault.json"];
    if (vault) {
      const docs = Array.isArray(vault)
        ? vault
        : vault.documents || vault.docs || [];
      for (const doc of docs) {
        parsed.docs.push({
          ...doc,
          content: stripHtml(doc.content || ""),
        });
        collectPerson(doc.creator, peopleMap);
      }
    }

    projects.push(parsed);
  }

  const allPeople = Array.from(peopleMap.values());

  return {
    projects,
    allPeople,
    stats: {
      projectCount: projects.length,
      taskListCount: projects.reduce((s, p) => s + p.todoLists.length, 0),
      taskCount: projects.reduce(
        (s, p) =>
          s +
          p.todoLists.reduce(
            (s2, tl) =>
              s2 + tl.todos.remaining.length + tl.todos.completed.length,
            0
          ),
        0
      ),
      messageCount: projects.reduce((s, p) => s + p.messages.length, 0),
      docCount: projects.reduce((s, p) => s + p.docs.length, 0),
      peopleCount: allPeople.length,
    },
  };
}
