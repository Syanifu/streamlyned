import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const events = await db.calendarEvent.findMany({
    where: { source: "agent_progress" },
    orderBy: { createdAt: "desc" }
  });
  console.log("Progress Events found:");
  events.forEach(e => {
    console.log(`- ID: ${e.id}\n  Title: ${e.title}\n  Source: ${e.source}\n  SourceRef: ${e.sourceRef}\n  ProgressPct: ${e.progressPct}\n  Priority: ${e.priority}\n  StartAt: ${e.startAt}\n  EndAt: ${e.endAt}\n`);
  });
  await db.$disconnect();
}

main().catch(console.error);
