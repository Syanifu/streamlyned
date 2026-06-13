import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("Initializing Prisma Client...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres.dzcxmsfaamsoztvceebd:B1k%40%241500Rva2@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
      }
    }
  });
  console.log("Attempting to query workspace table...");
  const workspaces = await prisma.workspace.findMany({ take: 1 });
  console.log("Success! Workspaces retrieved:", workspaces);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Database connection test failed:", err);
});
