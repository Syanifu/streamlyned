import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Dynamically optimize DATABASE_URL for serverless connection pooling
let url = process.env.DATABASE_URL;
if (url && url.includes("supabase.co") && url.includes(":5432")) {
  // Route through PgBouncer transaction pooler on port 6543
  url = url.replace(":5432", ":6543");
  if (!url.includes("pgbouncer=")) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}pgbouncer=true&connection_limit=3`;
  }
} else if (url && !url.includes("connection_limit=")) {
  // Limit connection pool size per serverless invocation container
  const sep = url.includes("?") ? "&" : "?";
  url = `${url}${sep}connection_limit=3`;
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
