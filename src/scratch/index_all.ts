import { PrismaClient } from "@prisma/client";
import { indexEntity } from "@/lib/ai/search";

const prisma = new PrismaClient();

async function indexAllSeededData() {
  console.log("Indexing all seeded entities in SQLite...");

  // 1. Fetch workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: "acme-agency" },
  });

  if (!workspace) {
    console.error("Workspace Acme Agency not found! Please run seed first.");
    process.exit(1);
  }

  // 2. Fetch and index tasks
  const tasks = await prisma.task.findMany({});
  console.log(`Indexing ${tasks.length} tasks...`);
  for (const t of tasks) {
    await indexEntity(
      workspace.id,
      "TASK",
      t.id,
      t.projectId,
      t.title + " " + (t.notes || "")
    );
  }

  // 3. Fetch and index discussions
  const discussions = await prisma.discussion.findMany({});
  console.log(`Indexing ${discussions.length} discussions...`);
  for (const d of discussions) {
    await indexEntity(
      workspace.id,
      "DISCUSSION",
      d.id,
      d.projectId,
      d.title + " " + d.content
    );
  }

  // 4. Fetch and index documents
  const docs = await prisma.doc.findMany({});
  console.log(`Indexing ${docs.length} documents...`);
  for (const doc of docs) {
    await indexEntity(
      workspace.id,
      "DOC",
      doc.id,
      doc.projectId,
      doc.title + " " + doc.content
    );
  }

  // 5. Fetch and index chat messages
  const chats = await prisma.chatMessage.findMany({});
  console.log(`Indexing ${chats.length} chat/DM messages...`);
  for (const chat of chats) {
    await indexEntity(
      workspace.id,
      "CHAT",
      chat.id,
      chat.projectId, // project ID is null for DMs, which matches schema
      chat.content
    );
  }

  console.log("Search indexing complete!");
  await prisma.$disconnect();
}

indexAllSeededData();
