import { PrismaClient } from "@prisma/client";
import { syncProjectProgress } from "../lib/agents/progress-sync";

async function main() {
  const db = new PrismaClient();
  const projects = await db.project.findMany({
    where: { deletedAt: null }
  });
  console.log("Projects found in database:");
  projects.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.name}, Agentic: ${p.agenticEnabled}, EndDate: ${p.endDate}`);
  });
  
  if (projects.length > 0) {
    const proj = projects[0];
    console.log(`\nTesting progress sync for project: ${proj.name} (${proj.id})`);
    
    // Ensure agenticEnabled is true for testing
    if (!proj.agenticEnabled) {
      console.log("Enabling agentic features temporarily for test...");
      await db.project.update({
        where: { id: proj.id },
        data: { agenticEnabled: true }
      });
    }
    
    // Ensure endDate is set
    if (!proj.endDate) {
      console.log("Setting temporary project end date for test...");
      await db.project.update({
        where: { id: proj.id },
        data: { endDate: new Date() }
      });
    }

    const res = await syncProjectProgress(proj.id);
    console.log("Sync result:", res);
  } else {
    console.log("No active projects found to test.");
  }
  await db.$disconnect();
}

main().catch(console.error);
