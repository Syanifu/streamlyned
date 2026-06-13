import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:B1k%40%241500Rva2@db.dzcxmsfaamsoztvceebd.supabase.co:5432/postgres"
      }
    }
  });
  
  console.log("Listing database tables...");
  const tables = await prisma.$queryRaw<any[]>`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log("Tables found:", tables.map(t => t.table_name));
  
  await prisma.$disconnect();
}

main().catch(console.error);
