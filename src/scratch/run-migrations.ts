import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:B1k%40%241500Rva2@db.dzcxmsfaamsoztvceebd.supabase.co:5432/postgres"
      }
    }
  });

  console.log("Running migrations on CalendarEvent table...");
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
  `);
  console.log("Added 'source' column.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS source_ref uuid;
  `);
  console.log("Added 'source_ref' column.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS progress_pct integer;
  `);
  console.log("Added 'progress_pct' column.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS agent_confidence text;
  `);
  console.log("Added 'agent_confidence' column.");

  console.log("Migration completed successfully!");
  
  await prisma.$disconnect();
}

main().catch(console.error);
