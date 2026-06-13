import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const members = await db.workspaceMember.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  console.log("Workspace Members in DB:");
  members.forEach(m => {
    console.log(`- User: ${m.user.name} (${m.user.email}) | ID: ${m.userId} | Role: ${m.role} | Workspace: ${m.workspaceId}`);
  });

  await db.$disconnect();
}

main().catch(console.error);
