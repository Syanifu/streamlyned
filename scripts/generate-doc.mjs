import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak, TableOfContents,
  StyleLevel,
} from "docx";
import fs from "fs";

const H1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 120 } });
const H2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 } });
const H3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 60 } });
const P = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, size: 22, ...opts })], spacing: { after: 120 } });
const BULLET = (text) => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } });
const BULLET2 = (text) => new Paragraph({ text, bullet: { level: 1 }, spacing: { after: 40 } });
const BR = () => new Paragraph({ text: "" });
const CODE = (text) => new Paragraph({
  children: [new TextRun({ text, font: "Courier New", size: 18, color: "2563EB" })],
  spacing: { after: 80 },
  indent: { left: 360 },
});

const CELL = (text, isHeader = false) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader, size: isHeader ? 20 : 18 })] })],
  shading: isHeader ? { type: ShadingType.SOLID, color: "1E293B", fill: "1E293B" } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
});
const CELL_LIGHT = (text, isHeader = false) => new TableCell({
  children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader, size: isHeader ? 20 : 18, color: isHeader ? "FFFFFF" : "0F172A" })] })],
  shading: isHeader ? { type: ShadingType.SOLID, color: "334155", fill: "334155" } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
});

function TABLE(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h => CELL_LIGHT(h, true)),
      }),
      ...rows.map(row => new TableRow({ children: row.map(cell => CELL_LIGHT(cell)) })),
    ],
  });
}

const doc = new Document({
  styles: {
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 36, bold: true, color: "0F172A", font: "Calibri" },
        paragraph: { spacing: { before: 480, after: 160 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 28, bold: true, color: "1E40AF", font: "Calibri" },
        paragraph: { spacing: { before: 320, after: 100 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 24, bold: true, color: "334155", font: "Calibri" },
        paragraph: { spacing: { before: 240, after: 80 } },
      },
    ],
  },
  sections: [
    {
      children: [
        // ─── COVER PAGE ───
        BR(), BR(), BR(),
        new Paragraph({
          children: [new TextRun({ text: "STREAMLYNED", size: 72, bold: true, color: "0F172A", font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Complete Product & Engineering Reference", size: 32, color: "475569", font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "Version 1.0  ·  June 2026", size: 22, color: "94A3B8", font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 1. PRODUCT OVERVIEW ───
        H1("1. Product Overview"),
        P("Streamlyned is an AI-native project management platform designed for small teams and solo founders. It consolidates scattered tools into a single unified workspace, applying a calm-work philosophy to reduce daily cognitive load."),
        BR(),
        H2("1.1 Core Philosophy"),
        BULLET("Retrieval over generation — AI retrieves, ranks, and cites workspace context rather than hallucinating."),
        BULLET("Workspace multi-tenancy & isolation — strict permission boundaries enforced at the database layer."),
        BULLET("Unlimited client collaboration — flat billing with no per-seat fees for client spaces."),
        BULLET("Calm-Work — replace noise with focused, structured workflows."),
        BR(),
        H2("1.2 Target Audience"),
        BULLET("Solo founders managing client work"),
        BULLET("Small product or creative agencies (2–20 people)"),
        BULLET("Freelancers who need client-facing project portals"),
        BR(),
        H2("1.3 Live URLs"),
        BULLET("Production: https://streamlyned.vercel.app"),
        BULLET("Custom domain: https://streamlyned.tech"),
        BULLET("Supabase project: https://dzcxmsfaamsoztvceebd.supabase.co"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 2. TECH STACK ───
        H1("2. Technology Stack"),
        BR(),
        TABLE(
          ["Layer", "Technology", "Version", "Purpose"],
          [
            ["Framework", "Next.js", "16.2.6", "Full-stack React framework (App Router)"],
            ["Language", "TypeScript", "5.x", "Primary language across all code"],
            ["UI Library", "React", "19.2.4", "Component rendering"],
            ["Styling", "Tailwind CSS", "4.x", "Utility-first CSS with custom design tokens"],
            ["ORM", "Prisma", "6.2.1", "Type-safe database access layer"],
            ["Database", "PostgreSQL (Supabase)", "—", "Primary data store via Supabase cloud"],
            ["Auth", "Supabase Auth + custom cookies", "2.x", "OAuth (Google/email OTP) + session cookies"],
            ["AI / LLM", "OpenAI GPT-4o / GPT-4o-mini", "openai ^6.42", "Completion, embedding, streaming"],
            ["AI SDK (alt)", "Anthropic SDK", "^0.104.2", "Alternative LLM provider"],
            ["File Storage", "Vercel Blob", "^2.4.0", "File uploads for tasks, chat, knowledge"],
            ["Calendar", "Google Calendar API (googleapis)", "^173.0.0", "Read & sync user calendar events"],
            ["Notion", "@notionhq/client", "^5.22.0", "One-time import of pages & databases"],
            ["Drag & Drop", "@dnd-kit", "6.x / 10.x", "Task list reordering"],
            ["Markdown", "marked", "^18.0.4", "Render document content"],
            ["Date Utils", "date-fns", "^4.3.0", "Date formatting & arithmetic"],
            ["Icons", "lucide-react", "^1.17.0", "Consistent icon set"],
            ["Toast", "react-hot-toast", "^2.6.0", "In-app notifications UI"],
            ["Deployment", "Vercel", "—", "Hosting, CI/CD, edge functions, cron"],
          ]
        ),
        BR(),
        H2("2.1 Language Breakdown"),
        BULLET("TypeScript — 100% of application code (frontend, backend, lib utilities)"),
        BULLET("Prisma Schema Language — database model definitions"),
        BULLET("SQL — via Prisma migrations (PostgreSQL dialect)"),
        BULLET("Python — ashy-agent/ directory (standalone AI agent scripts, not deployed to Vercel)"),
        BULLET("CSS — Tailwind utility classes, global.css for design tokens"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 3. ARCHITECTURE ───
        H1("3. Application Architecture"),
        BR(),
        H2("3.1 Directory Structure"),
        CODE("src/"),
        CODE("  app/                   Next.js App Router"),
        CODE("    actions/             Server Actions (auth, tasks, docs, calendar…)"),
        CODE("    api/                 Route Handlers (REST endpoints)"),
        CODE("      ai/                AI chat & config endpoints"),
        CODE("      agents/            Background agent endpoints"),
        CODE("      google/            Google OAuth + Calendar sync"),
        CODE("      notion/            Notion OAuth + import"),
        CODE("      project/[id]/      Project-scoped data APIs"),
        CODE("      upload/            File upload endpoints (Vercel Blob)"),
        CODE("    dashboard/           Authenticated page routes"),
        CODE("      projects/[id]/     Per-project tabbed view"),
        CODE("      settings/          Workspace settings"),
        CODE("      profile/           User profile & integrations"),
        CODE("      calendar/          Global calendar view"),
        CODE("      ask-ai/            AI context chat"),
        CODE("      everything/        Cross-workspace feed"),
        CODE("    auth/callback/       Supabase OAuth callback"),
        CODE("    onboarding/          New user workspace setup"),
        CODE("  components/            React client components"),
        CODE("    project/             Per-project tab components"),
        CODE("  lib/"),
        CODE("    ai/                  gateway.ts (LLM), search.ts (RAG)"),
        CODE("    agents/              progress-sync.ts"),
        CODE("    auth.ts              Session cookie helpers"),
        CODE("    db.ts                Prisma singleton"),
        CODE("    hash.ts              Password hashing"),
        CODE("  scratch/               Dev scripts (not deployed)"),
        CODE("prisma/"),
        CODE("  schema.prisma          Single source of truth for DB"),
        CODE("ashy-agent/              Python AI agent (standalone)"),
        BR(),
        H2("3.2 Rendering Strategy"),
        BULLET("Server Components — data-fetching pages (dashboard layouts, project pages)"),
        BULLET("Client Components — interactive UI (tabs, forms, modals, real-time chat)"),
        BULLET("Server Actions — all mutations (create/update/delete) avoid REST round-trips"),
        BULLET("Route Handlers — external webhooks, OAuth callbacks, streaming AI, file uploads"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 4. DATA MODELS ───
        H1("4. Data Models (Prisma Schema)"),
        P("All models live in prisma/schema.prisma and are backed by PostgreSQL on Supabase. IDs are UUIDs generated server-side."),
        BR(),

        H2("4.1 User"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["id", "String (UUID)", "Primary key"],
            ["email", "String (unique)", "Links Supabase auth identity"],
            ["name", "String", "Display name"],
            ["avatarUrl", "String?", "Profile picture URL"],
            ["coverUrl", "String?", "Profile cover image URL"],
            ["planTier", "String", "standard / premium / premium+"],
            ["passwordHash", "String?", "Argon-style hash for password login"],
            ["googleCalendarToken", "Relation", "One-to-one GoogleCalendarToken"],
          ]
        ),
        BR(),
        H2("4.2 Workspace"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["id", "String (UUID)", "Primary key"],
            ["name", "String", "Display name"],
            ["slug", "String (unique)", "URL-safe identifier used in session cookies"],
            ["apiKey", "String?", "Optional API key for external integrations"],
            ["notionConnection", "Relation", "One-to-one NotionConnection"],
            ["aiSettings", "Relation", "One-to-one AiSettings"],
            ["aiConfig", "Relation", "One-to-one AiConfig (custom system prompt)"],
          ]
        ),
        BR(),
        H2("4.3 WorkspaceMember"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["workspaceId + userId", "Composite unique", "Prevents duplicate membership"],
            ["role", "String", "OWNER | ADMIN | MEMBER | CLIENT | super_admin"],
          ]
        ),
        BR(),
        H2("4.4 Project"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["tools", "String (JSON)", "Array of enabled tools: tasks, discussions, chat, docs, calendar"],
            ["isArchived / archivedAt", "Boolean / DateTime", "Soft archive"],
            ["deletedAt", "DateTime?", "Soft delete"],
            ["startDate / endDate", "DateTime?", "Project timeline for calendar agent"],
            ["agenticEnabled", "Boolean", "Toggle for AI agent features per project"],
          ]
        ),
        BR(),
        H2("4.5 ProjectMember"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["visibleTools", "String (JSON)", "Client-specific tool restrictions e.g. [\"tasks\",\"docs\"]"],
          ]
        ),
        BR(),
        H2("4.6 Task"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["taskListId", "String", "Tasks belong to a TaskList (kanban column)"],
            ["position", "Float", "Fractional indexing for drag-drop ordering"],
            ["priority", "String", "P1–P6 (P1=Critical, P6=Archived)"],
            ["recurrence", "String?", "RRULE string for recurring tasks"],
            ["visibleToClients", "Boolean", "Show/hide from CLIENT role"],
            ["assignees", "Relation", "Many-to-many via TaskAssignee"],
            ["attachments", "Relation", "TaskAttachment (Vercel Blob URLs)"],
          ]
        ),
        BR(),
        H2("4.7 Doc & DocVersion"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["content", "String", "Markdown text"],
            ["versions", "Relation", "Full version history snapshots"],
            ["visibleToClients", "Boolean", "Client visibility toggle"],
          ]
        ),
        BR(),
        H2("4.8 Discussion"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["isPinned", "Boolean", "Pinned to top of discussion list"],
            ["visibleToClients", "Boolean", "Client visibility toggle"],
            ["subs", "Relation", "DiscussionSubscription for notification opt-in"],
          ]
        ),
        BR(),
        H2("4.9 ChatMessage"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["projectId?", "String?", "Project chat (null = DM)"],
            ["dmGroupId?", "String?", "Direct message group"],
            ["files", "Relation", "ChatMessageFile (Vercel Blob)"],
            ["reactions", "Relation", "ChatMessageReaction (emoji, unique per user)"],
          ]
        ),
        BR(),
        H2("4.10 CalendarEvent"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["source", "String", "manual | google | agent_progress | ical"],
            ["sourceRef", "UUID?", "Links back to originating entity (e.g. projectId)"],
            ["progressPct", "Int?", "Task completion % set by progress-sync agent"],
            ["agentConfidence", "String?", "AI confidence level for parsed events"],
            ["priority", "String", "P1–P6"],
          ]
        ),
        BR(),
        H2("4.11 Embedding"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["entityType", "String", "TASK | DISCUSSION | DOC | CHAT | FILE"],
            ["vector", "String (JSON)", "128-dim float array (OpenAI text-embedding-3-small)"],
            ["text", "String", "Original text used to generate embedding"],
          ]
        ),
        BR(),
        H2("4.12 AiSettings"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["provider", "String", "openai (default)"],
            ["embeddingsModel", "String", "text-embedding-3-small"],
            ["completionModel", "String", "gpt-4o-mini"],
            ["config", "String (JSON)", "Additional config overrides"],
          ]
        ),
        BR(),
        H2("4.13 NotionConnection"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["workspaceId", "String (unique)", "One connection per workspace"],
            ["accessToken", "String", "Notion OAuth access token"],
            ["botId", "String", "Notion bot identifier"],
            ["notionWorkspaceName", "String?", "Notion workspace display name"],
          ]
        ),
        BR(),
        H2("4.14 GoogleCalendarToken"),
        TABLE(
          ["Field", "Type", "Notes"],
          [
            ["userId", "String (unique)", "One token per user"],
            ["accessToken", "String", "Google OAuth access token"],
            ["refreshToken", "String?", "Google refresh token for offline access"],
            ["expiresAt", "DateTime?", "Token expiry"],
            ["syncedAt", "DateTime?", "Last sync timestamp"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 5. FEATURE LIST ───
        H1("5. Complete Feature List"),
        BR(),
        H2("5.1 Authentication & Onboarding"),
        BULLET("Email magic link (OTP) via Supabase Auth"),
        BULLET("Google OAuth sign-in via Supabase Auth"),
        BULLET("Auto-workspace creation for new users on first sign-in"),
        BULLET("Invited user onboarding flow — join existing workspace or create own"),
        BULLET("Session management via HTTP-only cookie pair (email + workspace slug)"),
        BULLET("Password-based login as fallback (hash stored in User.passwordHash)"),
        BR(),
        H2("5.2 Workspace & Roles"),
        BULLET("Multi-tenant workspaces with slug-based routing"),
        BULLET("Five roles: OWNER, ADMIN, MEMBER, CLIENT, super_admin"),
        BULLET("OWNER — full control including settings and billing"),
        BULLET("ADMIN — settings access, member management"),
        BULLET("MEMBER — full project access"),
        BULLET("CLIENT — scoped to assigned projects, restricted to visible tools"),
        BULLET("Role switching for developer testing via Dev Banner"),
        BR(),
        H2("5.3 Project Management"),
        BULLET("Create, archive, and soft-delete projects"),
        BULLET("Project tools toggle (tasks / discussions / chat / docs / calendar)"),
        BULLET("Per-member visible tools override for CLIENT role"),
        BULLET("Project start and end dates"),
        BULLET("Hill chart visualisation for project shape/progress"),
        BULLET("Project settings tab: member management, tools visibility"),
        BULLET("Agentic features toggle per project"),
        BR(),
        H2("5.4 Tasks"),
        BULLET("Task lists (kanban columns) with drag-and-drop reordering"),
        BULLET("Fractional position indexing for smooth reordering without renumbering"),
        BULLET("Task priority: P1 (Critical) → P6 (Archived)"),
        BULLET("Due dates with start and end range"),
        BULLET("Recurrence (RRULE string)"),
        BULLET("Task assignees (multiple)"),
        BULLET("File attachments via Vercel Blob"),
        BULLET("Client visibility toggle per task"),
        BULLET("Inline comments on tasks"),
        BULLET("Mark complete with timestamp"),
        BR(),
        H2("5.5 Documents"),
        BULLET("Rich markdown editor per project"),
        BULLET("Full version history with restore"),
        BULLET("Document comments"),
        BULLET("Client visibility toggle"),
        BULLET("AI meeting notes parser — on save, GPT-4o scans for dates and creates calendar event suggestions"),
        BULLET("Import from Notion pages (one-time)"),
        BR(),
        H2("5.6 Discussions"),
        BULLET("Threaded discussion posts per project"),
        BULLET("Inline comments"),
        BULLET("Pin to top"),
        BULLET("Client visibility toggle"),
        BULLET("Subscription notifications"),
        BR(),
        H2("5.7 Chat"),
        BULLET("Real-time-style project chat (polling-based)"),
        BULLET("File attachments in chat via Vercel Blob"),
        BULLET("Emoji reactions (unique per user per emoji)"),
        BULLET("Unread dot indicator in navigation"),
        BULLET("Direct Messages (DM) between workspace members"),
        BR(),
        H2("5.8 Calendar"),
        BULLET("Workspace-wide calendar view"),
        BULLET("Per-project calendar tab"),
        BULLET("Manual event creation with recurrence, video link, location"),
        BULLET("Google Calendar OAuth sync (read-only, pulls user events)"),
        BULLET("iCal export feed per workspace/user"),
        BULLET("AI progress-sync agent — auto-creates/updates project deadline events based on task completion %"),
        BULLET("Calendar event source tracking: manual | google | agent_progress | ical"),
        BR(),
        H2("5.9 AI Features"),
        BULLET("Context Chat — semantic search across all workspace content (Ask AI page)"),
        BULLET("Meeting notes parser — GPT-4o extracts dates from documents and sends confirm notifications"),
        BULLET("AI system prompt — customisable per workspace via AiConfig"),
        BULLET("Hybrid RAG pipeline — cosine similarity on OpenAI embeddings with role-aware permission filtering"),
        BULLET("Streaming responses in chat context"),
        BULLET("Fallback mock embeddings when no API key is set (for dev)"),
        BULLET("AI provider config (OpenAI by default, Anthropic SDK also installed)"),
        BR(),
        H2("5.10 Search"),
        BULLET("Cross-workspace semantic search via embedding cosine similarity"),
        BULLET("Permission-aware — CLIENTs only see entities they have access to"),
        BULLET("Entity types indexed: TASK, DISCUSSION, DOC, CHAT, FILE"),
        BULLET("Confidence threshold: similarity > 0.35 included, > 0.45 triggers AI synthesis"),
        BULLET("AI-synthesised answer with source citations"),
        BR(),
        H2("5.11 Notifications"),
        BULLET("In-app notification centre"),
        BULLET("Notification types: AGENT_CONFIRM (AI-suggested events), general"),
        BULLET("Read / unread state"),
        BULLET("Suppression support"),
        BULLET("Priority-tagged notifications"),
        BR(),
        H2("5.12 Profile & Settings"),
        BULLET("Display name, avatar preset picker (DiceBear), custom avatar URL"),
        BULLET("Cover image presets + custom URL"),
        BULLET("Plan tier selection (Standard / Premium / Premium+)"),
        BULLET("Connected Apps section — Google Calendar connect/sync, Notion connect/import"),
        BULLET("Workspace settings: invite members, change roles, remove members"),
        BULLET("Integrations panel: Notion OAuth connect + import modal"),
        BR(),
        H2("5.13 Everything Dashboard"),
        BULLET("Cross-project activity feed"),
        BULLET("Workspace knowledge base — upload files, index for AI search"),
        BULLET("Check-in questions — scheduled team prompts with answer threads"),
        BR(),
        H2("5.14 Integrations"),
        BULLET("Notion — OAuth connect, import pages as Docs, import databases as Projects+Tasks"),
        BULLET("Google Calendar — OAuth sync, read events into workspace calendar"),
        BULLET("iCal — export workspace calendar as .ics feed"),
        BULLET("Vercel Blob — file storage for task attachments, chat files, knowledge uploads"),
        BULLET("Supabase — database (PostgreSQL) and authentication (OAuth/OTP)"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 6. API REFERENCE ───
        H1("6. API Reference"),
        P("All routes are Next.js Route Handlers under src/app/api/. Authentication is enforced via getSession() cookie check unless noted."),
        BR(),
        H2("6.1 Authentication"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["GET", "/auth/callback", "Supabase OAuth code exchange → sets session cookie"],
            ["GET", "/api/google/auth", "Redirect to Google OAuth consent"],
            ["GET", "/api/google/callback", "Exchange Google code → store token in DB"],
            ["POST", "/api/google/sync", "Pull Google Calendar events into workspace"],
            ["GET", "/api/notion/auth", "Redirect to Notion OAuth consent"],
            ["GET", "/api/notion/callback", "Exchange Notion code → store token in DB"],
          ]
        ),
        BR(),
        H2("6.2 AI"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["POST", "/api/ai/context-chat", "Hybrid semantic search + AI synthesis answer"],
            ["GET/POST", "/api/ai/config", "Read/write workspace AI system prompt"],
            ["POST", "/api/ai", "Generic AI completion endpoint"],
          ]
        ),
        BR(),
        H2("6.3 Notion"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["GET", "/api/notion/pages", "List connected Notion pages and databases"],
            ["POST", "/api/notion/import", "Import selected pages (→ Docs) and databases (→ Projects)"],
          ]
        ),
        BR(),
        H2("6.4 Project Data"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["GET", "/api/project/[projectId]/calendar", "Fetch project calendar events"],
            ["GET", "/api/project/[projectId]/chat", "Fetch project chat messages (polling)"],
            ["GET", "/api/project/[projectId]/discussions", "Fetch project discussions"],
            ["GET", "/api/project/[projectId]/docs", "Fetch project documents"],
            ["GET", "/api/ical/[workspaceSlug]/[userId]", "iCal feed (.ics export)"],
          ]
        ),
        BR(),
        H2("6.5 File Uploads"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["POST", "/api/upload/chat-file", "Upload file in chat → Vercel Blob URL"],
            ["POST", "/api/upload/project-file", "Upload project file → Vercel Blob URL"],
            ["POST", "/api/upload/workspace-knowledge", "Upload knowledge base file → indexed for AI"],
          ]
        ),
        BR(),
        H2("6.6 Agents (Internal)"),
        TABLE(
          ["Method", "Path", "Auth", "Description"],
          [
            ["POST", "/api/agents/parse-notes", "Bearer INTERNAL_API_SECRET", "GPT-4o meeting notes parser → creates notifications"],
            ["POST", "/api/agents/progress-sync", "Vercel Cron", "Syncs task completion % to calendar event"],
          ]
        ),
        BR(),
        H2("6.7 DMs"),
        TABLE(
          ["Method", "Path", "Description"],
          [
            ["GET/POST", "/api/dm/[dmGroupId]", "Fetch / send direct messages"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 7. SERVER ACTIONS ───
        H1("7. Server Actions"),
        P("Server Actions (src/app/actions/) run on the server and are called directly from Client Components without a REST round-trip."),
        BR(),
        TABLE(
          ["File", "Key Actions"],
          [
            ["auth.ts", "loginAction, createWorkspaceAction, logoutAction, switchUserAction, joinWorkspaceAction, createOwnWorkspaceAction"],
            ["tasks.ts", "createTaskAction, updateTaskAction, deleteTaskAction, toggleTaskCompleteAction, moveTaskAction, assignTaskAction"],
            ["docs.ts", "createDocAction, updateDocAction, restoreDocVersionAction, addDocCommentAction"],
            ["project.ts", "createProjectAction, updateProjectAction, archiveProjectAction, deleteProjectAction, addProjectMemberAction"],
            ["communication.ts", "createDiscussionAction, addCommentAction, sendChatMessageAction, createDmGroupAction"],
            ["calendar.ts", "createEventAction, updateEventAction, deleteEventAction"],
            ["settings.ts", "inviteUserAction, changeUserRoleAction, removeWorkspaceMemberAction"],
            ["profile.ts", "updateProfileAction"],
            ["notifications.ts", "markNotificationReadAction, dismissNotificationAction, confirmAgentEventAction"],
            ["theme.ts", "setThemeAction"],
            ["nudges.ts", "sendNudgeAction"],
            ["superadmin.ts", "Super-admin workspace management actions"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 8. AI SYSTEM ───
        H1("8. AI System Deep Dive"),
        BR(),
        H2("8.1 AI Gateway (src/lib/ai/gateway.ts)"),
        P("A singleton class (aiGateway) that abstracts all LLM calls. Supports: complete(), stream(), embed(), classify(), rerank(), summarize()."),
        BR(),
        TABLE(
          ["Method", "Model", "Description"],
          [
            ["complete()", "gpt-4o-mini", "Single-turn text completion, optional JSON schema mode"],
            ["stream()", "gpt-4o-mini", "Streaming token output via ReadableStream"],
            ["embed()", "text-embedding-3-small", "128-dim vector from text (128 dim mock fallback)"],
            ["classify()", "gpt-4o-mini", "Zero-shot label classification"],
            ["rerank()", "keyword heuristic", "Re-scores candidates by query word overlap"],
            ["summarize()", "gpt-4o-mini", "Summarises text with optional citation requirement"],
          ]
        ),
        BR(),
        H2("8.2 RAG Pipeline (src/lib/ai/search.ts)"),
        P("executeHybridSearch() implements a secure multi-tenant retrieval-augmented generation pipeline:"),
        BR(),
        BULLET("Step 1 — Embed the query using text-embedding-3-small"),
        BULLET("Step 2 — Fetch all embeddings for the workspace from the Embedding table"),
        BULLET("Step 3 — Permission filter: verify project membership, CLIENT tool restrictions, DM group membership"),
        BULLET("Step 4 — Cosine similarity scoring between query vector and each entity vector"),
        BULLET("Step 5 — Filter: similarity > 0.35; top 5 results selected"),
        BULLET("Step 6 — If top score > 0.45: build context string and call GPT-4o-mini for synthesised answer with citations"),
        BULLET("Step 7 — Return answer + ranked results array"),
        BR(),
        H2("8.3 Meeting Notes Agent (parse-notes)"),
        P("Triggered automatically after every Doc save (fire-and-forget fetch). Uses GPT-4o with a structured JSON extraction prompt:"),
        BR(),
        CODE("System: You are a meeting notes parser. Extract any future dates, times,"),
        CODE("or scheduling language. Return ONLY a JSON array. Each item:"),
        CODE("{ title, date (YYYY-MM-DD), time (HH:MM|null), confidence (high|medium|low),"),
        CODE("  raw_text, priority (1-6|null) }"),
        BR(),
        BULLET("Only high/medium confidence items are actioned"),
        BULLET("Creates AGENT_CONFIRM notification for the document author"),
        BULLET("Author can accept (create calendar event) or dismiss from the notifications panel"),
        BULLET("Skips documents under 50 words"),
        BULLET("Respects per-project agenticEnabled toggle"),
        BR(),
        H2("8.4 Progress Sync Agent"),
        P("Runs on Vercel Cron (daily at midnight UTC). For each project with an end date and agenticEnabled=true:"),
        BULLET("Calculates task completion percentage (done / total)"),
        BULLET("Upserts a CalendarEvent (source=agent_progress) with progressPct"),
        BULLET("Archives the event (P6) if 100% complete and 7 days past end date"),
        BR(),
        H2("8.5 Custom System Prompt"),
        P("Workspace owners can set a custom AI system prompt via AiConfig model (Settings → AI Config). The parse-notes agent loads this prompt as the system message context before its extraction instructions."),
        BR(),
        H2("8.6 Default System Prompt"),
        CODE("\"You are a focused project management assistant. Be concise and direct.\""),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 9. INTEGRATIONS ───
        H1("9. Integrations"),
        BR(),
        H2("9.1 Supabase"),
        TABLE(
          ["Aspect", "Detail"],
          [
            ["Auth", "Email OTP (magic link) + Google OAuth provider"],
            ["Database", "PostgreSQL — Prisma connects directly via DATABASE_URL"],
            ["Callback URL", "/auth/callback — exchanges Supabase code, resolves workspace, sets cookies"],
            ["Session model", "Custom HTTP-only cookies (not Supabase sessions) after initial OAuth"],
          ]
        ),
        BR(),
        H2("9.2 Google Calendar"),
        TABLE(
          ["Aspect", "Detail"],
          [
            ["OAuth flow", "Offline access, calendar.readonly + userinfo.email scopes"],
            ["Token storage", "GoogleCalendarToken model (access + refresh token, expiry)"],
            ["Sync", "POST /api/google/sync — pulls events and upserts CalendarEvent rows (source=google)"],
            ["Redirect URI", "NEXT_PUBLIC_SITE_URL + /api/google/callback"],
          ]
        ),
        BR(),
        H2("9.3 Notion"),
        TABLE(
          ["Aspect", "Detail"],
          [
            ["OAuth flow", "Public Notion integration, user-level owner token"],
            ["Token storage", "NotionConnection model per workspace"],
            ["Pages import", "Fetches page blocks → converts to Markdown → creates Doc"],
            ["Database import", "Queries database rows → creates Project + TaskList + Tasks"],
            ["Redirect URI", "NEXT_PUBLIC_SITE_URL + /api/notion/callback"],
            ["SDK version", "@notionhq/client v5.22 (dataSources.query API)"],
          ]
        ),
        BR(),
        H2("9.4 Vercel Blob"),
        TABLE(
          ["Aspect", "Detail"],
          [
            ["Task attachments", "POST /api/upload/project-file → blob URL stored in TaskAttachment"],
            ["Chat files", "POST /api/upload/chat-file → blob URL stored in ChatMessageFile"],
            ["Knowledge base", "POST /api/upload/workspace-knowledge → text extracted, indexed for AI search"],
          ]
        ),
        BR(),
        H2("9.5 Vercel Platform"),
        TABLE(
          ["Aspect", "Detail"],
          [
            ["Deployment", "Automatic production deploy via vercel --prod"],
            ["Cron jobs", "vercel.json: /api/agents/progress-sync runs daily at 00:00 UTC"],
            ["Environment", "All secrets managed via Vercel Environment Variables"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 10. ENV VARS ───
        H1("10. Environment Variables"),
        BR(),
        TABLE(
          ["Variable", "Required", "Description"],
          [
            ["DATABASE_URL", "Yes", "PostgreSQL connection string (Supabase)"],
            ["NEXT_PUBLIC_SUPABASE_URL", "Yes", "Supabase project API URL"],
            ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Yes", "Supabase public anon key"],
            ["NEXT_PUBLIC_SITE_URL", "Yes", "Public app URL (used in OAuth redirect URIs)"],
            ["INTERNAL_API_SECRET", "Yes", "Bearer token for internal agent-to-agent calls"],
            ["OPENAI_API_KEY", "Yes (AI features)", "OpenAI API key"],
            ["GOOGLE_CLIENT_ID", "Yes (Calendar)", "Google OAuth 2.0 Client ID"],
            ["GOOGLE_CLIENT_SECRET", "Yes (Calendar)", "Google OAuth 2.0 Client Secret"],
            ["NOTION_CLIENT_ID", "Yes (Notion)", "Notion OAuth Client ID"],
            ["NOTION_CLIENT_SECRET", "Yes (Notion)", "Notion OAuth Client Secret"],
            ["CRON_SECRET", "Optional", "Vercel cron authentication secret"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 11. AUTH FLOW ───
        H1("11. Authentication Flow"),
        BR(),
        H2("11.1 Email Magic Link"),
        BULLET("User enters email on landing page"),
        BULLET("supabase.auth.signInWithOtp() sends magic link"),
        BULLET("Link redirects to /auth/callback?code=..."),
        BULLET("Callback exchanges code → gets user email from Supabase"),
        BULLET("Finds or creates User in Prisma"),
        BULLET("Resolves workspace membership → sets cookie pair (email + slug)"),
        BULLET("Redirects to /dashboard"),
        BR(),
        H2("11.2 Google OAuth"),
        BULLET("User clicks 'Continue with Google'"),
        BULLET("supabase.auth.signInWithOAuth() redirects to Google"),
        BULLET("Google redirects to Supabase → Supabase redirects to /auth/callback"),
        BULLET("Same callback flow as above"),
        BR(),
        H2("11.3 Session"),
        BULLET("Two HTTP-only cookies: streamlyned_user_email + streamlyned_workspace_slug"),
        BULLET("1-week expiry, secure in production, SameSite=lax"),
        BULLET("getSession() validates against DB on every server request"),
        BULLET("requireSession() throws if no session (used in Server Actions)"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 12. PERMISSION MODEL ───
        H1("12. Permission & Multi-Tenancy Model"),
        BR(),
        P("Every data query is scoped to the active workspace via session.workspace.id. No data leaks across workspaces."),
        BR(),
        TABLE(
          ["Role", "Workspace", "Projects", "Tasks", "Chat", "Docs", "Discussions", "Settings"],
          [
            ["OWNER", "Full", "All", "All", "All", "All", "All", "Full"],
            ["ADMIN", "Full", "All", "All", "All", "All", "All", "Full"],
            ["MEMBER", "Read", "Assigned", "All", "All", "All", "All", "None"],
            ["CLIENT", "Read", "Assigned only", "visibleToClients only", "If enabled", "If enabled", "If enabled", "None"],
            ["super_admin", "All workspaces", "All", "All", "All", "All", "All", "All"],
          ]
        ),
        BR(),
        P("CLIENT tool access is controlled per ProjectMember.visibleTools JSON array. The AI RAG pipeline enforces these same permissions at query time."),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 13. PYTHON AGENT ───
        H1("13. Python Agent (ashy-agent/)"),
        P("A standalone Python module in /ashy-agent/ containing AI agent tooling. Not deployed to Vercel — runs independently or as a background process."),
        BR(),
        TABLE(
          ["File", "Purpose"],
          [
            ["agent.py", "Main agent entry point"],
            ["db.py", "Database access layer (connects to same Supabase PostgreSQL)"],
            ["tools.py", "Agent tool definitions"],
            ["requirements.txt", "Python dependencies"],
          ]
        ),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 14. CRON JOBS ───
        H1("14. Cron Jobs & Background Tasks"),
        BR(),
        TABLE(
          ["Job", "Schedule", "Endpoint", "Description"],
          [
            ["Progress Sync", "0 0 * * * (daily midnight UTC)", "/api/agents/progress-sync", "Sync all projects' task % to calendar events"],
          ]
        ),
        BR(),
        P("Additional background tasks (fire-and-forget, not cron):"),
        BULLET("Meeting notes parser — triggered on every Doc save via internal fetch with Bearer auth"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 15. DESIGN SYSTEM ───
        H1("15. Design System"),
        BR(),
        H2("15.1 Tokens (globals.css)"),
        BULLET("--background, --surface — page and card backgrounds"),
        BULLET("--border-custom — consistent border colour"),
        BULLET("--brand-accent — primary accent (blue/indigo)"),
        BULLET("--brand-success — green for success states"),
        BULLET("Dark mode support via CSS variables and dark: Tailwind variants"),
        BR(),
        H2("15.2 Typography"),
        BULLET("Font: system-sans (Calibri-class via Tailwind default)"),
        BULLET("Text scales: text-[9px] labels → text-xl headings"),
        BULLET("Uppercase tracking-wider labels for section headers"),
        BR(),
        H2("15.3 Layout Patterns"),
        BULLET("Navigation capsule — floating pill-shaped nav (bottom-center on mobile, left on desktop)"),
        BULLET("Max-width containers (max-w-4xl, max-w-6xl) for readable content"),
        BULLET("Grid-based settings and profile layouts"),
        BULLET("Tabbed project view (tasks / discussions / chat / docs / calendar / settings)"),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 16. DEPLOYMENT ───
        H1("16. Deployment"),
        BR(),
        H2("16.1 Vercel"),
        BULLET("Framework: Next.js (auto-detected)"),
        BULLET("Build command: next build (Turbopack enabled)"),
        BULLET("Output: dynamic SSR (all routes are ƒ Dynamic)"),
        BULLET("Region: Washington D.C. (iad1)"),
        BULLET("Project ID: prj_TR2BzIWJXyVGp6tInYUkq8xwka49"),
        BR(),
        H2("16.2 Database"),
        BULLET("Prisma db push for schema changes (no migration history)"),
        BULLET("Supabase PostgreSQL — db.dzcxmsfaamsoztvceebd.supabase.co:5432"),
        BR(),
        H2("16.3 Local Development"),
        CODE("npm run dev      # Next.js dev server with Turbopack"),
        CODE("npx prisma db push   # Sync schema changes"),
        CODE("npx vercel env pull  # Pull production env vars"),
        BR(),
        new Paragraph({
          children: [new TextRun({ text: "— End of Document —", size: 20, color: "94A3B8", italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("Streamlyned-Product-Reference.docx", buffer);
console.log("✅ Streamlyned-Product-Reference.docx generated successfully.");
