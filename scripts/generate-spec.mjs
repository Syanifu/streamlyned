// Generates Streamlyned-Complete-Build-Spec.docx
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
  convertInchesToTwip, LevelFormat,
} from "docx";
import { writeFileSync } from "fs";

// ── helpers ────────────────────────────────────────────────────────────────────

const TEAL   = "1FA884";
const BLACK  = "111111";
const GRAY   = "6B7280";
const LGRAY  = "F3F4F6";
const DGRAY  = "374151";
const WHITE  = "FFFFFF";

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    border: { bottom: { color: TEAL, size: 6, style: BorderStyle.SINGLE, space: 4 } },
    run: { color: BLACK, bold: true, size: 36 },
  });
}

function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    run: { color: DGRAY, bold: true, size: 28 },
  });
}

function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    run: { color: DGRAY, bold: true, size: 24 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: BLACK, ...opts })],
    spacing: { after: 80 },
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    children: [new TextRun({ text, size: 21, color: BLACK })],
    spacing: { after: 40 },
    indent: { left: convertInchesToTwip(0.25 + level * 0.25) },
  });
}

function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: "Courier New", size: 18, color: "1F2937" })],
    spacing: { after: 40 },
    indent: { left: convertInchesToTwip(0.25) },
    shading: { type: ShadingType.SOLID, color: "F9FAFB", fill: "F9FAFB" },
  });
}

function label(k, v) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${k}: `, bold: true, size: 21, color: DGRAY }),
      new TextRun({ text: v, size: 21, color: BLACK }),
    ],
    spacing: { after: 40 },
  });
}

function divider() {
  return new Paragraph({
    text: "",
    border: { bottom: { color: "E5E7EB", size: 4, style: BorderStyle.SINGLE, space: 2 } },
    spacing: { before: 160, after: 160 },
  });
}

function twoColTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([a, b]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LGRAY, fill: LGRAY },
            children: [new Paragraph({ children: [new TextRun({ text: a, bold: true, size: 20, color: DGRAY })], spacing: { before: 60, after: 60 }, indent: { left: 80 } })],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: b, size: 20, color: BLACK })], spacing: { before: 60, after: 60 }, indent: { left: 80 } })],
          }),
        ],
      })
    ),
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

function codeBlock(lines) {
  return lines.map(l => code(l));
}

function pg() { return new Paragraph({ children: [new PageBreak()] }); }

// ── document sections ──────────────────────────────────────────────────────────

const sections = [];

// ── COVER PAGE ────────────────────────────────────────────────────────────────
sections.push(
  new Paragraph({
    children: [new TextRun({ text: "Streamlyned", bold: true, size: 72, color: TEAL })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 1440, after: 160 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Complete Product & Technical Reference", size: 36, color: DGRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "v3.0 · June 2026", size: 24, color: GRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: "Calm-Work · AI-Native · Multi-Tenant", italics: true, size: 24, color: GRAY })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
  }),
  pg(),
);

// ── 1. PRODUCT OVERVIEW ───────────────────────────────────────────────────────
sections.push(
  h1("1. Product Overview"),
  p("Streamlyned is a calm, AI-native project management platform designed for small teams and solo founders. It replaces scattered channels with unified workspaces, reduces daily cognitive load, and applies AI retrieval (not generation) to surface exactly what teams need."),
  divider(),
  h2("1.1 Core Philosophy"),
  bullet("Retrieval over generation — AI cites your team's existing context rather than hallucinating content"),
  bullet("Calm-Work — fewer notifications, less noise, deliberate decision surfaces"),
  bullet("Unified workspace — tasks, docs, chat, calendar, and client collaboration in one place"),
  bullet("Strict multi-tenancy — workspace-level data isolation at the database layer"),
  bullet("Client collaboration — unlimited client seats with configurable visibility per tool and per task"),
  divider(),
  h2("1.2 Target Users"),
  twoColTable([
    ["Solo founders",    "Consolidated personal workspace; AI surfaces priorities"],
    ["Small agencies",   "Client portals, approval flows, project-scoped chat and docs"],
    ["Freelancers",      "Project + task management with direct client collaboration"],
    ["Internal teams",  "Role-based access (OWNER / ADMIN / MEMBER / CLIENT)"],
  ]),
  divider(),
  h2("1.3 Deployment"),
  twoColTable([
    ["Platform",       "Vercel (edge-optimised Node.js serverless)"],
    ["Production URL", "https://streamlyned.vercel.app"],
    ["Repository",     "github.com/Syanifu/streamlyned (main branch)"],
    ["Database",       "Supabase PostgreSQL (managed)"],
    ["Auth provider",  "Supabase Auth (passwordless magic-link + OAuth)"],
    ["File storage",   "Vercel Blob"],
  ]),
  pg(),
);

// ── 2. TECHNOLOGY STACK ───────────────────────────────────────────────────────
sections.push(
  h1("2. Technology Stack"),
  h2("2.1 Core Framework"),
  twoColTable([
    ["Next.js",       "16.2.6 — App Router, Server Actions, Route Handlers, server-only enforcement"],
    ["React",         "19.2.4 — concurrent rendering, new hooks"],
    ["TypeScript",    "5.x — strict mode across entire codebase"],
    ["Tailwind CSS",  "3.x — utility-first, custom design tokens (brand-accent, surface, border-custom)"],
    ["Prisma ORM",    "6.2.1 — type-safe DB client, migrations, schema-first"],
    ["PostgreSQL",    "Supabase-managed — full-text, UUID primary keys, cascade deletes"],
  ]),
  divider(),
  h2("2.2 Key Dependencies"),
  twoColTable([
    ["@supabase/ssr + supabase-js", "Auth (magic-link, Google OAuth), session exchange"],
    ["openai ^6",                   "Embeddings (text-embedding-3-small), completions (gpt-4o-mini)"],
    ["@anthropic-ai/sdk ^0.104",    "Ashy AI agent (claude-sonnet-4-6)"],
    ["@notionhq/client ^5",         "Notion API v5 — pages, databases, blocks"],
    ["googleapis ^173",             "Google Calendar + Drive OAuth2"],
    ["zod ^4",                      "Runtime schema validation on all external inputs"],
    ["@dnd-kit/*",                  "Drag-and-drop for task reordering"],
    ["@vercel/blob",                "Vercel Blob file storage"],
    ["docx ^9",                     "DOCX generation for this specification"],
    ["lucide-react ^1.17",          "Icon library"],
    ["date-fns ^4",                 "Date utilities"],
    ["marked ^18",                  "Markdown → HTML"],
    ["react-hot-toast",             "Toast notifications"],
  ]),
  pg(),
);

// ── 3. ARCHITECTURE ───────────────────────────────────────────────────────────
sections.push(
  h1("3. System Architecture"),
  h2("3.1 Request Flow"),
  bullet("Browser → Vercel Edge → Next.js App Router"),
  bullet("Server Component pages load data server-side — no client fetch waterfalls"),
  bullet("Server Actions handle mutations (forms, toggles) — no REST needed for most UI"),
  bullet("Route Handlers (/api/*) serve OAuth callbacks, file uploads, and external webhooks"),
  bullet("All DB access goes through the Data Access Layer (src/lib/dal/) — never raw Prisma in components"),
  divider(),
  h2("3.2 Security Architecture"),
  h3("Session Model"),
  p("Opaque server-side sessions. The cookie holds a random 32-byte hex token. The server stores SHA-256(token) in the Session table. Cookie theft is mitigated because the hash cannot be reversed; the raw token is never stored."),
  twoColTable([
    ["Cookie name",    "streamlyned_session (httpOnly, secure, sameSite=lax)"],
    ["Token entropy",  "32 bytes = 256 bits"],
    ["Storage",        "SHA-256 hash stored in Session.tokenHash (unique index)"],
    ["TTL",            "7 days, sliding on each request (lastUsedAt update)"],
    ["Revocation",     "revokedAt timestamp — checked before every session use"],
    ["Logout-all",     "revokeAllSessions(userId) marks all sessions revoked"],
  ]),
  divider(),
  h3("Token Encryption"),
  p("All OAuth access/refresh tokens stored in the Connection table are encrypted at rest using AES-256-GCM before writing to the database."),
  twoColTable([
    ["Algorithm",    "AES-256-GCM (authenticated encryption with associated data)"],
    ["Key",          "32-byte random key, base64-encoded in ENCRYPTION_KEY env var"],
    ["IV",           "12-byte random per-encrypt"],
    ["Format",       "iv:authTag:ciphertext (all base64, colon-delimited)"],
    ["Key rotation", "Re-encrypt Connection rows with new key (not yet automated)"],
  ]),
  divider(),
  h3("Security Headers"),
  twoColTable([
    ["Content-Security-Policy", "default-src 'self'; script/style/font/img/connect/frame restricted to known hosts"],
    ["HSTS",                    "max-age=63072000; includeSubDomains; preload"],
    ["X-Frame-Options",         "DENY"],
    ["X-Content-Type-Options",  "nosniff"],
    ["Referrer-Policy",         "strict-origin-when-cross-origin"],
    ["Permissions-Policy",      "camera=(), microphone=(), geolocation=()"],
  ]),
  divider(),
  h2("3.3 Data Access Layer (DAL)"),
  p("All Prisma queries are isolated in src/lib/dal/. Every function accepts a Ctx object sourced from the verified session — never from client input. Functions enforce workspace scoping and role checks before touching the database."),
  twoColTable([
    ["context.ts",     "Ctx type, assertRole(), canManageWorkspace()"],
    ["connections.ts", "upsertConnection, getConnection (with decrypted tokens), revokeConnection, upsertExternalItem, findExternalItem"],
    ["projects.ts",    "listProjects, getProject, createProject, archiveProject"],
    ["tasks.ts",       "getTask, listTasksForList, createTask, updateTask"],
    ["docs.ts",        "getDoc, listDocs, createDoc (+ initial version), updateDoc (+ new version)"],
    ["index.ts",       "Barrel re-export of all DAL modules"],
  ]),
  pg(),
);

// ── 4. DATA STRUCTURES ────────────────────────────────────────────────────────
sections.push(
  h1("4. Data Models (Prisma Schema)"),
  h2("4.1 Core User & Workspace Models"),
  h3("User"),
  twoColTable([
    ["id",           "UUID PK"],
    ["email",        "String @unique"],
    ["name",         "String"],
    ["avatarUrl",    "String? (Google photo URL or Dicebear)"],
    ["coverUrl",     "String?"],
    ["planTier",     "String (standard | premium | premium+)"],
    ["passwordHash", "String? (reserved, not used — Supabase handles auth)"],
    ["Relations",    "sessions, connections, memberships, projectMemberships, chatMessages, notifications, auditLogs, etc."],
  ]),
  divider(),
  h3("Workspace"),
  twoColTable([
    ["id",       "UUID PK"],
    ["name",     "String"],
    ["slug",     "String @unique (URL-safe identifier)"],
    ["apiKey",   "String? @unique (external API access, future)"],
    ["Relations","members, projects, docs, sessions, connections, notifications, events, embeddings, aiSettings"],
  ]),
  divider(),
  h3("WorkspaceMember"),
  twoColTable([
    ["workspaceId + userId", "@@unique compound"],
    ["role",                 "OWNER | ADMIN | MEMBER | CLIENT"],
  ]),
  divider(),
  h2("4.2 Project Models"),
  h3("Project"),
  twoColTable([
    ["tools",          "JSON array string: tasks | discussions | chat | docs | calendar"],
    ["agenticEnabled", "Boolean — whether AI agent monitors this project"],
    ["startDate/endDate", "Optional timeline bounds"],
    ["isArchived",     "Soft-archive flag"],
    ["deletedAt",      "Soft-delete timestamp"],
  ]),
  h3("ProjectMember"),
  twoColTable([
    ["visibleTools", "JSON array — per-member tool visibility override"],
    ["unique",       "[projectId, userId]"],
  ]),
  h3("TaskList → Task"),
  twoColTable([
    ["position",        "Float — fractional indexing for drag-and-drop order"],
    ["priority",        "P1 | P2 | P3 | P4"],
    ["visibleToClients","Boolean — CLIENT role filter"],
    ["recurrence",      "String (iCal RRULE format)"],
  ]),
  h3("TaskAssignee / TaskAttachment"),
  p("Many-to-many assignees (unique per task+user). Attachments store fileUrl from Vercel Blob."),
  divider(),
  h2("4.3 Communication Models"),
  h3("Discussion + Comment"),
  twoColTable([
    ["isPinned",        "Boolean"],
    ["visibleToClients","Boolean"],
    ["Subscriptions",   "DiscussionSubscription — per-user opt-in for notifications"],
  ]),
  h3("ChatMessage"),
  twoColTable([
    ["projectId",  "Optional — project chat"],
    ["dmGroupId",  "Optional — direct message group"],
    ["files",      "ChatMessageFile[] — inline attachments"],
    ["reactions",  "ChatMessageReaction[] — unique per [message, user, emoji]"],
  ]),
  h3("DmGroup + DmGroupMember"),
  p("Workspace-scoped direct message groups. Members unique per group."),
  divider(),
  h2("4.4 Document Models"),
  h3("Doc + DocVersion"),
  twoColTable([
    ["content",         "Markdown string"],
    ["visibleToClients","Boolean"],
    ["DocVersion",      "Append-only version history: version Int, createdById String"],
  ]),
  divider(),
  h2("4.5 Calendar & Notification Models"),
  h3("CalendarEvent"),
  twoColTable([
    ["source",         "manual | google | agent"],
    ["sourceRef",      "UUID ref to originating entity"],
    ["progressPct",    "Int? — agent-set progress percentage"],
    ["agentConfidence","String? — agent confidence level"],
    ["videoCallLink",  "String? (Zoom/Meet URL)"],
    ["recurrence",     "iCal RRULE string"],
  ]),
  h3("Notification"),
  twoColTable([
    ["type",         "String (task_assigned | mention | check_in | agent_event | etc.)"],
    ["priority",     "P1 | P2 | P3 | P4"],
    ["isSuppressed", "Boolean — AI-suppressed low-priority noise"],
    ["targetUrl",    "Deep-link into the relevant dashboard section"],
  ]),
  divider(),
  h2("4.6 AI & Knowledge Models"),
  h3("AiSettings (per workspace)"),
  twoColTable([
    ["provider",         "openai (default) | anthropic"],
    ["embeddingsModel",  "text-embedding-3-small"],
    ["completionModel",  "gpt-4o-mini"],
    ["config",           "JSON string — additional model parameters"],
  ]),
  h3("Embedding"),
  twoColTable([
    ["entityType", "TASK | DOC | DISCUSSION | FILE | CHAT | NOTE"],
    ["vector",     "JSON string (pending migration to pgvector HNSW column)"],
    ["text",       "Indexed text used to generate the embedding"],
  ]),
  h3("WorkspaceKnowledge"),
  p("Files uploaded to the workspace knowledge base. Text content extracted for AI indexing. Storage: Vercel Blob in production, local filesystem in dev."),
  divider(),
  h2("4.7 Integration Models (Phase 0 + Phase 1)"),
  h3("Session"),
  twoColTable([
    ["tokenHash",     "SHA-256(cookie_token) @unique — only hash stored, never raw token"],
    ["expiresAt",     "DateTime — validated on every request"],
    ["revokedAt",     "DateTime? — soft-revoke for logout"],
    ["lastUsedAt",    "DateTime — sliding expiry"],
    ["ipHash",        "String? — hashed IP for audit"],
    ["userAgentHash", "String? — hashed UA for audit"],
  ]),
  h3("Connection"),
  twoColTable([
    ["provider",            "google | notion | airtable | obsidian | evernote"],
    ["ownerType",           "USER (personal) | WORKSPACE (shared)"],
    ["accessToken",         "AES-256-GCM encrypted string"],
    ["refreshToken",        "AES-256-GCM encrypted string?"],
    ["tokenSecret",         "AES-256-GCM encrypted (OAuth1 only)"],
    ["scopes",              "JSON array string"],
    ["status",              "active | expired | revoked | error"],
    ["externalAccountId",   "Provider account ID (e.g. Google user ID)"],
    ["externalAccountName", "Human-readable account label"],
    ["metadata",            "JSON — provider-specific data (e.g. Obsidian file list)"],
    ["lastError",           "String? — last error message (max 500 chars)"],
  ]),
  h3("ExternalItem"),
  twoColTable([
    ["connectionId + externalId", "@@unique — dedup key"],
    ["externalType",              "page | database | record | file | doc | note"],
    ["localEntityType",           "DOC | PROJECT | TASK | FILE | EMBEDDING"],
    ["localEntityId",             "UUID of the Streamlyned entity"],
    ["contentHash",               "SHA-256 of content — skip re-import if unchanged"],
    ["syncDirection",             "inbound (default) | outbound"],
  ]),
  h3("AuditEvent"),
  p("Append-only cross-cutting audit trail. actorUserId, workspaceId, action, resourceType, resourceId, ipHash, metadata (JSON)."),
  pg(),
);

// ── 5. API ROUTES ─────────────────────────────────────────────────────────────
sections.push(
  h1("5. API Routes"),
  h2("5.1 Integration Routes  /api/integrations/[provider]/"),
  twoColTable([
    ["GET  /auth",        "Redirects to provider OAuth URL (state = random 16-byte hex). File providers return 400."],
    ["GET  /callback",    "Exchanges code → tokens → upsertConnection → redirect to /dashboard/profile"],
    ["GET  /items",       "Lists importable items (pages, databases, files) from connected account"],
    ["POST /import",      "Imports selected items: pages→Docs, databases→Projects+TaskLists+Tasks. Dedup via ExternalItem + contentHash."],
    ["GET  /",            "Returns connection status (no tokens exposed)"],
    ["DELETE /",          "Revokes connection (OWNER/ADMIN only)"],
    ["POST /obsidian/upload", "Accepts .md/.txt files (max 10 MB), stores content in Connection.metadata"],
  ]),
  divider(),
  h2("5.2 Project Routes  /api/project/[projectId]/"),
  twoColTable([
    ["GET /calendar",    "Returns CalendarEvents for a project"],
    ["GET /chat",        "Returns ChatMessages for a project"],
    ["GET /discussions", "Returns Discussions for a project"],
    ["GET /docs",        "Returns Docs for a project"],
  ]),
  divider(),
  h2("5.3 AI Routes  /api/ai/"),
  twoColTable([
    ["POST /",              "General AI completion (workspace context)"],
    ["GET/POST /config",    "Read/write AiSettings for workspace"],
    ["POST /context-chat",  "RAG-augmented context-aware chat using embeddings"],
  ]),
  divider(),
  h2("5.4 Upload Routes  /api/upload/"),
  twoColTable([
    ["POST /chat-file",          "Upload file attachment for chat messages"],
    ["POST /project-file",       "Upload file to project file store"],
    ["POST /workspace-knowledge","Upload knowledge base file (text extracted, embedded for AI)"],
    ["DELETE /workspace-knowledge","Remove a knowledge file + its embedding"],
  ]),
  divider(),
  h2("5.5 Legacy Redirect Routes"),
  twoColTable([
    ["GET /api/notion/auth",       "→ /api/integrations/notion/auth"],
    ["GET /api/notion/callback",   "→ /api/integrations/notion/callback?{qs}"],
    ["GET /api/google/auth",       "→ /api/integrations/google/auth"],
    ["GET /api/google/callback",   "→ /api/integrations/google/callback?{qs}"],
  ]),
  p("Legacy routes preserved so existing OAuth redirect URIs registered in Google Cloud Console and Notion developer portal continue working during migration."),
  divider(),
  h2("5.6 Other Routes"),
  twoColTable([
    ["GET /api/ical/[slug]/[userId]",  "iCal feed for calendar subscription"],
    ["GET /api/dm/[dmGroupId]",        "DM group messages"],
    ["GET /api/debug-ai",              "Dev-only AI environment check"],
    ["GET /api/agents/progress-sync",  "Agent periodic progress sync trigger"],
    ["POST /api/agents/parse-notes",   "AI parse meeting notes into tasks/events"],
  ]),
  pg(),
);

// ── 6. SERVER ACTIONS ─────────────────────────────────────────────────────────
sections.push(
  h1("6. Server Actions"),
  p("Server Actions are Next.js 16 'use server' functions called directly from client components. They run on the server, have access to cookies and DB, and eliminate the need for most custom API endpoints."),
  divider(),
  h2("auth.ts"),
  bullet("loginAction(formData) — Magic-link email trigger via Supabase"),
  bullet("createWorkspaceAction(formData) — Create + auto-join workspace, set session"),
  bullet("joinWorkspaceAction(workspaceSlug) — Join by slug, set session"),
  bullet("switchUserAction(email, workspaceSlug) — Dev-mode fast user switching"),
  bullet("logoutAction() — clearSession() + redirect /"),
  divider(),
  h2("integrations.ts"),
  bullet("connectIntegrationAction(provider) — Validates provider, returns /api/integrations/[p]/auth URL"),
  bullet("disconnectIntegrationAction(provider) — Role-checked revocation"),
  bullet("getConnectionStatusAction(provider) — Safe status (no tokens) for UI"),
  bullet("importItemsAction(input) — Zod-validated, proxies to /api/integrations/[p]/import"),
  divider(),
  h2("project.ts"),
  bullet("createProjectAction — Create project + auto-add caller as member"),
  bullet("updateProjectAction — Edit name, description, dates"),
  bullet("updateProjectToolsAction — Toggle visible tools"),
  bullet("archiveProjectAction / deleteProjectAction"),
  bullet("addProjectMemberAction / removeProjectMemberAction"),
  bullet("updateMemberVisibleToolsAction — Per-member tool visibility"),
  bullet("toggleProjectAgenticAction — Enable/disable AI agent monitoring"),
  divider(),
  h2("tasks.ts"),
  bullet("createTaskAction — Create task with priority, assignees, visibility"),
  bullet("updateTaskAction — Edit any task field"),
  bullet("moveTaskAction — Reorder / move between lists (fractional position)"),
  bullet("addCommentAction — Add task comment"),
  divider(),
  h2("docs.ts"),
  bullet("createDocAction — Create doc + initial DocVersion"),
  bullet("updateDocAction — Update content + save new version"),
  bullet("restoreDocVersionAction — Restore a prior version (creates new version)"),
  bullet("addDocCommentAction"),
  divider(),
  h2("communication.ts"),
  bullet("createDiscussionAction / addDiscussionCommentAction"),
  bullet("sendChatMessageAction — Project or DM chat"),
  bullet("addChatReactionAction — Emoji reactions"),
  bullet("createDmGroupAction(recipientEmails) — Create DM group"),
  bullet("deleteChatMessageAction"),
  divider(),
  h2("calendar.ts"),
  bullet("createCalendarEventAction — Manual event creation"),
  bullet("createStructuredCalendarEventAction — AI-parsed event from natural language"),
  bullet("updateCalendarEventAction / deleteCalendarEventAction"),
  bullet("parseMeetingNotesAction — AI extracts tasks + events from notes text"),
  divider(),
  h2("settings.ts"),
  bullet("inviteUserAction(email, name, role) — Invite + create pending WorkspaceMember"),
  bullet("changeUserRoleAction(memberId, newRole)"),
  bullet("removeWorkspaceMemberAction(memberId)"),
  divider(),
  h2("notifications.ts"),
  bullet("markNotificationReadAction / markAllNotificationsReadAction"),
  bullet("getSuppressionExplanationAction — AI explains why a notification was suppressed"),
  bullet("confirmAgentEventAction / dismissAgentEventAction — Approve/reject AI-proposed events"),
  divider(),
  h2("Other Actions"),
  bullet("updateProfileAction — Name, avatar, cover, plan tier"),
  bullet("saveThemeAction / saveColorThemeAction — Persist theme to cookie"),
  bullet("toggleClientVisibility — Toggle task/doc/discussion CLIENT visibility"),
  bullet("nudge actions — AI-powered quick task creation, priority inference, reassignment"),
  pg(),
);

// ── 7. INTEGRATION FRAMEWORK ─────────────────────────────────────────────────
sections.push(
  h1("7. Integration Framework"),
  h2("7.1 ProviderAdapter Interface"),
  p("All integrations implement a single ProviderAdapter interface defined in src/lib/integrations/adapter.ts:"),
  ...codeBlock([
    "interface ProviderAdapter {",
    "  key: string",
    "  getAuthUrl(state, scopes?): Promise<string | null>   // null = file-based",
    "  exchangeCode(code, ctx): Promise<TokenSet | null>    // null = file-based",
    "  refresh?(conn): Promise<TokenSet | null>",
    "  listImportable(conn): Promise<ImportCandidate[]>",
    "  fetchItem(conn, externalId, externalType): Promise<FetchedContent>",
    "  pushItem?(conn, localEntityId): Promise<void>        // optional writeback",
    "}",
  ]),
  divider(),
  h2("7.2 Provider Registry"),
  twoColTable([
    ["google",   "USER-owned · OAuth2 · Calendar (readonly) + Drive (file) · supports refresh"],
    ["notion",   "WORKSPACE-owned · OAuth2 · pages + databases · no refresh (long-lived tokens)"],
    ["airtable", "WORKSPACE-owned · OAuth2 + PKCE · bases/tables → Projects/Tasks · supports refresh"],
    ["obsidian", "USER-owned · File-based · .md/.txt vault upload · no OAuth"],
    ["evernote", "USER-owned · OAuth1 · manual API key approval required · disabled until approved"],
  ]),
  divider(),
  h2("7.3 Import Pipeline"),
  bullet("1. User selects items via /api/integrations/[provider]/items"),
  bullet("2. POST /api/integrations/[provider]/import with selected externalIds"),
  bullet("3. findExternalItem() checks if item was previously imported"),
  bullet("4. If found and contentHash matches → skip (no duplicate)"),
  bullet("5. If found and hash differs → update existing Doc/Task"),
  bullet("6. If new → create Doc (pages/files) or Project+TaskList+Tasks (databases/tables)"),
  bullet("7. upsertExternalItem() records the mapping for future dedup"),
  divider(),
  h2("7.4 Obsidian File Flow"),
  bullet("User toggles Obsidian on profile page → file picker opens (.md/.txt)"),
  bullet("POST /api/integrations/obsidian/upload — parses content, stores in Connection.metadata"),
  bullet("Connection.externalAccountName = '{n} files' for display"),
  bullet("listImportable() reads metadata.files[] — returns one ImportCandidate per file"),
  bullet("fetchItem() resolves [[wikilinks]] to display text before import"),
  pg(),
);

// ── 8. PRODUCT FEATURES ───────────────────────────────────────────────────────
sections.push(
  h1("8. Product Features"),
  h2("8.1 Projects"),
  bullet("Create projects with name, description, start/end dates"),
  bullet("Per-project tool selection: tasks, discussions, chat, docs, calendar"),
  bullet("Project members with per-member visible tool control"),
  bullet("Archive and soft-delete"),
  bullet("AI agent monitoring toggle (agenticEnabled)"),
  bullet("Hill Chart for progress visualisation"),
  bullet("Project file attachments (Vercel Blob storage)"),
  divider(),
  h2("8.2 Tasks"),
  bullet("Task lists with fractional-index drag-and-drop ordering"),
  bullet("Priority levels: P1 (critical) → P4 (low)"),
  bullet("Assignees (multiple), due dates (start + end), recurrence (RRULE)"),
  bullet("CLIENT visibility toggle per task"),
  bullet("Inline comments and file attachments"),
  bullet("AI nudges: infer priority, set due date, reassign from natural language"),
  divider(),
  h2("8.3 Docs"),
  bullet("Rich markdown editor per project"),
  bullet("Full version history (DocVersion) — restore any prior version"),
  bullet("CLIENT visibility toggle"),
  bullet("Inline comments"),
  bullet("Import from Notion, Obsidian, or Google Drive via integration pipeline"),
  divider(),
  h2("8.4 Discussions"),
  bullet("Forum-style threaded discussions per project"),
  bullet("Pin important discussions"),
  bullet("Subscription notifications (per-user opt-in)"),
  bullet("CLIENT visibility toggle"),
  divider(),
  h2("8.5 Chat"),
  bullet("Real-time project chat (polling-based)"),
  bullet("Direct Messages (DmGroup) — workspace-scoped"),
  bullet("Emoji reactions (unique per message+user+emoji)"),
  bullet("File attachments in chat"),
  bullet("Unread dot in navigation"),
  divider(),
  h2("8.6 Calendar"),
  bullet("Workspace-scoped calendar events with attendees"),
  bullet("Google Calendar sync (read + import)"),
  bullet("AI-generated events from meeting notes (parseMeetingNotesAction)"),
  bullet("iCal feed for external calendar subscription"),
  bullet("Priority levels on events"),
  bullet("Agent-created events with confidence score (requiresConfirmation flow)"),
  divider(),
  h2("8.7 Notifications"),
  bullet("In-app notification centre with read/unread state"),
  bullet("Priority-weighted — P1 always shown, P3/P4 can be AI-suppressed"),
  bullet("AI suppression: explains why a notification was suppressed"),
  bullet("Agent event confirmations: approve or dismiss AI-proposed calendar events"),
  divider(),
  h2("8.8 AI Features"),
  bullet("Context Chat — RAG-augmented AI using workspace embeddings"),
  bullet("Hybrid search — keyword + vector similarity across tasks, docs, discussions, files"),
  bullet("Ashy AI agent — monitors projects, detects stalls, suggests tasks/events"),
  bullet("AI nudges — natural language → task creation, priority, assignee, due date"),
  bullet("Meeting notes parser — plain text → structured tasks + calendar events"),
  bullet("Notification suppression — AI decides which P3/P4 notifications are noise"),
  bullet("System prompt customisation per workspace"),
  divider(),
  h2("8.9 Client Collaboration"),
  bullet("CLIENT role: read-only access to explicitly enabled tools/tasks/docs"),
  bullet("visibleToClients flag on Task, Discussion, Doc"),
  bullet("Per-member tool visibility override via ProjectMember.visibleTools"),
  bullet("Unlimited client seats — flat billing model"),
  divider(),
  h2("8.10 Profile & Settings"),
  bullet("Display name, avatar (preset, Google photo, or custom URL), cover image"),
  bullet("Plan tier selection (Standard / Premium / Premium+)"),
  bullet("Connected Apps panel: Google, Notion, Airtable, Obsidian, Evernote (toggles)"),
  bullet("Theme: light / dark + colour accent"),
  bullet("Workspace member management: invite, role change, remove"),
  bullet("Visible tools control per workspace member"),
  pg(),
);

// ── 9. AUTH FLOWS ─────────────────────────────────────────────────────────────
sections.push(
  h1("9. Authentication & Auth Flows"),
  h2("9.1 Sign-In Flow"),
  bullet("1. User enters email on landing page → loginAction() → Supabase magic-link"),
  bullet("2. Supabase emails OTP link → user clicks → /auth/callback?code=..."),
  bullet("3. exchangeCodeForSession() verifies code with Supabase"),
  bullet("4. User record found or created in Prisma (avatar seeded from Google metadata)"),
  bullet("5. WorkspaceMember resolved — new users auto-get a workspace"),
  bullet("6. setSession(userId, workspaceId) creates Session row + opaque cookie"),
  bullet("7. Redirect to /dashboard"),
  divider(),
  h2("9.2 Google OAuth Sign-In"),
  bullet("Supabase handles the Google OAuth2 redirect and token exchange"),
  bullet("user_metadata.avatar_url and full_name extracted from Supabase callback"),
  bullet("Existing users with no avatar get backfilled from Google metadata on login"),
  divider(),
  h2("9.3 OAuth Integration Flows  (Notion / Google Drive / Airtable)"),
  bullet("1. User toggles integration on profile page"),
  bullet("2. connectIntegrationAction() returns /api/integrations/[provider]/auth URL"),
  bullet("3. Browser navigates to auth URL → GET handler → getAuthUrl(state) → redirect to provider"),
  bullet("4. Provider redirects to /api/integrations/[provider]/callback?code=&state="),
  bullet("5. exchangeCode() → TokenSet → upsertConnection() (tokens AES-256-GCM encrypted)"),
  bullet("6. Redirect to /dashboard/profile"),
  divider(),
  h2("9.4 Session Lifecycle"),
  twoColTable([
    ["Creation",   "setSession() — random 32-byte token, SHA-256 stored, 7-day TTL"],
    ["Validation", "getSession() — hash cookie, DB lookup, check expiry + revokedAt, update lastUsedAt"],
    ["Enforcement","requireSession() — throws 'Unauthorized' if no valid session"],
    ["Logout",     "clearSession() — sets revokedAt, deletes cookie"],
    ["Logout-all", "revokeAllSessions(userId) — marks all sessions revoked"],
  ]),
  pg(),
);

// ── 10. ENVIRONMENT VARIABLES ─────────────────────────────────────────────────
sections.push(
  h1("10. Environment Variables"),
  twoColTable([
    ["DATABASE_URL",                "Supabase PostgreSQL connection string"],
    ["NEXT_PUBLIC_SUPABASE_URL",    "Supabase project URL"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY","Supabase anon/public key"],
    ["ENCRYPTION_KEY",              "32-byte base64 key for AES-256-GCM token encryption (REQUIRED)"],
    ["GOOGLE_CLIENT_ID",            "Google OAuth2 Client ID (Calendar + Drive)"],
    ["GOOGLE_CLIENT_SECRET",        "Google OAuth2 Client Secret"],
    ["NOTION_CLIENT_ID",            "Notion OAuth2 Client ID"],
    ["NOTION_CLIENT_SECRET",        "Notion OAuth2 Client Secret"],
    ["AIRTABLE_CLIENT_ID",          "Airtable OAuth2 Client ID (Phase 3)"],
    ["AIRTABLE_CLIENT_SECRET",      "Airtable OAuth2 Client Secret (Phase 3)"],
    ["OPENAI_API_KEY",              "OpenAI API key (embeddings + completions)"],
    ["NEXT_PUBLIC_SITE_URL",        "https://streamlyned.vercel.app (used for OAuth redirects)"],
    ["BLOB_READ_WRITE_TOKEN",       "Vercel Blob token (file uploads)"],
    ["CRON_SECRET",                 "Secret for cron-triggered agent routes"],
    ["NEXTAUTH_SECRET",             "Legacy — kept for compatibility"],
  ]),
  divider(),
  h2("Generating ENCRYPTION_KEY"),
  ...codeBlock([
    "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
  ]),
  p("Set this value in Vercel project settings under Environment Variables (all environments)."),
  pg(),
);

// ── 11. BUILD PHASES ──────────────────────────────────────────────────────────
sections.push(
  h1("11. Build Phases"),
  h2("Phase 0 — Security Foundation  (COMPLETE)"),
  bullet("Replace email-cookie sessions with opaque server-side SHA-256 token model"),
  bullet("AES-256-GCM encryption for all OAuth tokens at rest"),
  bullet("Data Access Layer (src/lib/dal/) — single entry point for all DB access"),
  bullet("Zod input validation on all new routes and actions"),
  bullet("Security headers via next.config.ts (CSP, HSTS, X-Frame-Options)"),
  bullet("Session model: Session, AuditEvent Prisma models added"),
  divider(),
  h2("Phase 1 — Integration Framework  (COMPLETE)"),
  bullet("Unified Connection + ExternalItem Prisma models"),
  bullet("ProviderAdapter interface with generic OAuth + file-based support"),
  bullet("Provider registry with lazy adapter loading"),
  bullet("Generic /api/integrations/[provider]/ routes (auth, callback, items, import, status, delete)"),
  bullet("All 5 provider implementations: Notion, Google, Airtable, Obsidian, Evernote"),
  bullet("Dedup pipeline: ExternalItem + contentHash prevents duplicate imports"),
  bullet("Legacy /api/notion/* and /api/google/* preserved as redirects"),
  divider(),
  h2("Phase 2 — Google Drive  (PLANNED)"),
  bullet("Drive file picker UI"),
  bullet("Doc ingestion (Google Docs → Markdown → Doc entity)"),
  bullet("GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET must be configured"),
  divider(),
  h2("Phase 3 — Airtable  (PLANNED)"),
  bullet("Full PKCE implementation for Airtable OAuth2"),
  bullet("Base/table import → Project + TaskList + Tasks"),
  bullet("AIRTABLE_CLIENT_ID + AIRTABLE_CLIENT_SECRET required"),
  divider(),
  h2("Phase 4 — Obsidian  (COMPLETE - upload flow)"),
  bullet("Vault/zip or individual .md/.txt file upload"),
  bullet("Wikilink resolution on import"),
  bullet("Connection.metadata stores file list server-side"),
  divider(),
  h2("Phase 5 — Evernote  (GATED)"),
  bullet("OAuth1 + Thrift API — requires manual Evernote API key approval"),
  bullet("Shown as 'Coming soon' in UI until keys are approved"),
  bullet("Adapter stub implemented — no production calls"),
  pg(),
);

// ── 12. PENDING WORK ──────────────────────────────────────────────────────────
sections.push(
  h1("12. Known Pending Work"),
  h2("Critical (before full production)"),
  bullet("Update Google OAuth redirect URI in Google Cloud Console to /api/integrations/google/callback"),
  bullet("Update Notion OAuth redirect URI to /api/integrations/notion/callback"),
  bullet("Migrate existing NotionConnection + GoogleCalendarToken data to Connection model"),
  bullet("Update legacy UI components that still call /api/notion/pages and /api/notion/import directly"),
  divider(),
  h2("Infrastructure"),
  bullet("pgvector migration: Embedding.vector column → proper vector type with HNSW index"),
  bullet("Row-Level Security (RLS) on Supabase + non-superuser DB role"),
  bullet("Airtable PKCE: replace placeholder code_challenge with real implementation"),
  divider(),
  h2("Features"),
  bullet("Google Drive file picker UI (Phase 2)"),
  bullet("Airtable full sync (Phase 3)"),
  bullet("Evernote integration after API key approval (Phase 5)"),
  bullet("Notification delivery via email (Resend / Postmark)"),
  bullet("Key rotation tooling for ENCRYPTION_KEY"),
  pg(),
);

// ── 13. DIRECTORY STRUCTURE ───────────────────────────────────────────────────
sections.push(
  h1("13. Directory Structure"),
  ...codeBlock([
    "streamlyned/",
    "├── prisma/",
    "│   └── schema.prisma              37 models, PostgreSQL",
    "├── public/                         Static assets",
    "├── scripts/",
    "│   └── generate-spec.mjs          This document generator",
    "├── src/",
    "│   ├── app/",
    "│   │   ├── actions/               14 Server Action files",
    "│   │   ├── api/                   28 Route Handler files",
    "│   │   ├── auth/callback/         Supabase OAuth callback",
    "│   │   ├── dashboard/             13 page routes + layout",
    "│   │   ├── onboarding/            Onboarding flow",
    "│   │   ├── globals.css            Tailwind + design tokens",
    "│   │   └── layout.tsx             Root layout + metadata",
    "│   ├── components/",
    "│   │   ├── project/               6 project sub-components",
    "│   │   └── *.tsx                  23 top-level components",
    "│   └── lib/",
    "│       ├── auth.ts                Opaque session management",
    "│       ├── crypto.ts              AES-256-GCM + SHA-256",
    "│       ├── db.ts                  Prisma singleton",
    "│       ├── dal/                   Data Access Layer (5 modules)",
    "│       ├── integrations/",
    "│       │   ├── adapter.ts         ProviderAdapter interface",
    "│       │   ├── registry.ts        Provider config + lazy loading",
    "│       │   └── providers/         5 adapter implementations",
    "│       └── ai/                    Embeddings, search, agent",
    "├── next.config.ts                 Security headers + config",
    "└── package.json                   Dependencies",
  ]),
  pg(),
);

// ── BUILD THE DOC ─────────────────────────────────────────────────────────────

const doc = new Document({
  title: "Streamlyned Complete Product & Technical Reference",
  description: "Full product spec, data models, API routes, build phases, and code architecture",
  creator: "Streamlyned",
  styles: {
    default: {
      document: {
        run: { font: "DM Sans", size: 22, color: BLACK },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "bullet-numbering",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT },
          { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT },
        ],
      },
    ],
  },
  sections: [{ children: sections }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "./Streamlyned-Complete-Build-Spec-v3.docx";
writeFileSync(outPath, buffer);
console.log(`✓ Written: ${outPath}`);
