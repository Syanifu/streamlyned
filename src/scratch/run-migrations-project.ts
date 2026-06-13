import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:B1k%40%241500Rva2@db.dzcxmsfaamsoztvceebd.supabase.co:5432/postgres"
      }
    }
  });

  console.log("Running migrations on Project table...");
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS agentic_enabled boolean DEFAULT true;
  `);
  console.log("Added 'agentic_enabled' column.");

  console.log("Migration completed successfully!");
  
  await prisma.$disconnect();
}

main().catch(console.error);
