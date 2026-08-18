import { PrismaClient } from "@prisma/client";
import { executeHybridSearch } from "@/lib/ai/search";

const prisma = new PrismaClient();

async function runAdversarialTests() {
  console.log("--------------------------------------------------");
  console.log("RUNNING STREAMLYNED SECURITY & BOUNDARY TESTS...");
  console.log("--------------------------------------------------");

  let passCount = 0;
  let failCount = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failCount++;
    }
  };

  try {
    // 1. Fetch seed users and workspace
    const owner = await prisma.user.findFirst({ where: { email: "owner@streamlyned.com" } });
    const client = await prisma.user.findFirst({ where: { email: "client@streamlyned.com" } });
    const workspace = await prisma.workspace.findUnique({ where: { slug: "acme-agency" } });
    const project1 = await prisma.project.findFirst({ where: { name: "Website Redesign" } });
    const project2 = await prisma.project.findFirst({ where: { name: "Q3 Campaign" } });

    if (!owner || !client || !workspace || !project1 || !project2) {
      throw new Error("Seeded test data not found. Please run `npx tsx prisma/seed.ts` first.");
    }

    console.log("Context Loaded.");
    console.log(`Owner ID: ${owner.id}`);
    console.log(`Client ID: ${client.id}`);
    console.log(`Workspace ID: ${workspace.id}`);
    console.log(`Project 1 (Visible to Client): ${project1.name} (${project1.id})`);
    console.log(`Project 2 (Hidden to Client): ${project2.name} (${project2.id})`);

    // --- TEST 1: Project Membership Scoping ---
    // The client is invited to Project 1 but NOT Project 2.
    const clientProj1Mem = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project1.id, userId: client.id } },
    });
    const clientProj2Mem = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project2.id, userId: client.id } },
    });

    assert(clientProj1Mem !== null, "Client is a member of Project 1 (Website Redesign)");
    assert(clientProj2Mem === null, "Client is NOT a member of Project 2 (Q3 Campaign)");

    // --- TEST 2: Multi-Tenant & Role Scoped Search Permissions ---
    // Let's search for the DM between Owner and Admin.
    const dmMessage = await prisma.chatMessage.findFirst({
      where: { content: { contains: "board meeting" } },
    });

    if (dmMessage) {
      const dmEmbedding = await prisma.embedding.findFirst({
        where: { entityType: "CHAT", entityId: dmMessage.id },
      });

      assert(dmEmbedding !== null, "Indexed DM message in search embeddings");

      // Verify that a search by the CLIENT for "board meeting next week" returns NOTHING
      const searchResult = await executeHybridSearch(
        workspace.id,
        client.id,
        "CLIENT",
        "board meeting next week"
      );

      const hasDmInResults = searchResult.results.some((r) => r.id === dmMessage.id);
      assert(!hasDmInResults, "Client search FILTER OUT private DMs");
      assert(
        searchResult.answer.includes("No confident match found"),
        "Client search answer synthesis handles unauthorized DMs by returning 'No confident match'"
      );

      // Verify that a search by the OWNER for the same query successfully finds the DM
      const ownerSearchResult = await executeHybridSearch(
        workspace.id,
        owner.id,
        "OWNER",
        "board meeting next week"
      );
      const ownerHasDm = ownerSearchResult.results.some((r) => r.id === dmMessage.id);
      assert(ownerHasDm, "Owner search successfully retrieves private DMs they participate in");
    }

    // --- TEST 3: Access control on disabled tools for Clients ---
    // In Project 1, Client visibility has only ["tasks", "discussions"].
    const projectChatMsg = await prisma.chatMessage.findFirst({
      where: { projectId: project1.id },
    });

    if (projectChatMsg) {
      const chatSearchResult = await executeHybridSearch(
        workspace.id,
        client.id,
        "CLIENT",
        "project chat synchronous check"
      );
      const clientHasChatResult = chatSearchResult.results.some((r) => r.id === projectChatMsg.id);
      assert(!clientHasChatResult, "Client search filters out tool records (Chat) not visible to them");
    }

    // --- TEST 4: Cross-Tenant Isolation ---
    // If we perform a search in another dummy workspace ID, we should get 0 results
    const fakeWorkspaceId = "00000000-0000-0000-0000-000000000000";
    const crossTenantSearch = await executeHybridSearch(
      fakeWorkspaceId,
      owner.id,
      "OWNER",
      "wireframes"
    );
    assert(crossTenantSearch.results.length === 0, "Querying search in fake workspace yields zero results (cross-tenant isolation)");

    console.log("--------------------------------------------------");
    console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED.`);
    console.log("--------------------------------------------------");

  } catch (error) {
    console.error("Verification test execution failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runAdversarialTests();
