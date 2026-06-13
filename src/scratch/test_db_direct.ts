import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("Initializing Prisma Client for Direct Connection...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:B1k%40%241500Rva2@db.dzcxmsfaamsoztvceebd.supabase.co:5432/postgres"
      }
    }
  });
  console.log("Attempting to query workspace table...");
  const workspaces = await prisma.workspace.findMany({ take: 1 });
  console.log("Success! Workspaces retrieved:", workspaces);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Direct connection test failed:", err);
});
