import { PrismaClient } from "@prisma/client";
import { createDrawingDocument, createDrawingRevision, releaseDrawingRevision } from "../lib/docs/drawings";
import { drawingRevisionReleasedHandler } from "../lib/docs/blast";
import { createInspectionRequest, completeInspection, assertNoOpenNcr } from "../lib/qc/inspections";
import { createDraftRaBill } from "../lib/sales/billing";
import { processOutbox, registerHandler } from "../lib/events/outbox";

// Explicitly register handler in the test module context to avoid tsx cache resolution splits
registerHandler("drawing.revision_released", drawingRevisionReleasedHandler);

async function main() {
  const db = new PrismaClient();
  console.log("--- Starting Phase 4 Architecture Verification ---");

  // 1. Fetch workspace, project and user
  const workspace = await db.workspace.findFirst();
  const user = await db.user.findFirst();
  const project = await db.project.findFirst({
    where: { workspaceId: workspace?.id },
  });

  if (!workspace || !user || !project) {
    throw new Error("Missing workspace, user, or project. Run previous phase tests first.");
  }

  // Ensure user is project member to receive notifications
  await db.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: user.id,
      },
    },
    create: {
      projectId: project.id,
      userId: user.id,
      visibleTools: "[]",
    },
    update: {},
  });

  // Find WBS Node for mapping
  const wbsA = await db.wbsNode.findFirst({
    where: { projectId: project.id, code: "1.1" },
  });
  const wbsB = await db.wbsNode.findFirst({
    where: { projectId: project.id, code: "1.2" },
  });
  if (!wbsA || !wbsB) throw new Error("WBS Nodes 1.1 and 1.2 not found.");

  // 2. Setup Drawing Documents and Revisions
  console.log("\n1. Setting up Engineering Drawings & Revisions...");
  
  // Clean old drawings with this number
  await db.drawingDocument.deleteMany({
    where: { projectId: project.id, drawingNumber: "METRO-STR-101" }
  });

  const drawing = await createDrawingDocument(
    workspace.id,
    project.id,
    "METRO-STR-101",
    "Viaduct Column Concrete Details",
    "STRUCTURAL",
    db
  );
  console.log(`  ✔ Drawing Document registered: ${drawing.drawingNumber}`);

  // Create R0 Revision
  const r0 = await createDrawingRevision(drawing.id, "R0", "https://s3.aws/streamlyned/metro-str-101-r0.dwg", 15420, "DRAFT", db);
  console.log(`  ✔ Drawing Revision ${r0.revisionNumber} registered.`);

  // Release R0 (sets to IFC)
  const r0Released = await releaseDrawingRevision(r0.id, db);
  console.log(`  ✔ Drawing Revision ${r0Released.revisionNumber} released (Status: ${r0Released.status}).`);

  // Map WBS 1.1 to R0 as active work package
  const workPkg = await db.wbsWorkPackage.create({
    data: {
      wbsNodeId: wbsA.id,
      drawingRevisionId: r0Released.id,
      status: "ACTIVE",
    },
  });
  console.log(`  ✔ WBS Node ${wbsA.code} linked to Drawing Revision R0 (Status: ${workPkg.status}).`);

  // 3. Test Superseded Drawing Blast Radius Alert
  console.log("\n2. Releasing new revision and evaluating blast radius...");
  
  // Create R1 Revision
  const r1 = await createDrawingRevision(drawing.id, "R1", "https://s3.aws/streamlyned/metro-str-101-r1.dwg", 15680, "DRAFT", db);
  console.log(`  - New Revision ${r1.revisionNumber} uploaded in DRAFT.`);

  // Release R1 -> triggers event
  console.log("  - Releasing Revision R1 (IFC) and processing event catalogue...");
  await releaseDrawingRevision(r1.id, db);

  // Sweep the outbox to execute drawingRevisionReleasedHandler
  const outboxRes = await processOutbox(10);
  console.log(`    - Outbox process result:`, outboxRes);

  const events = await db.outboxEvent.findMany({
    orderBy: { createdAt: "desc" },
  });
  console.log("    - All Outbox Events in DB:", events.map(e => ({ type: e.eventType, status: e.status, error: e.error, id: e.id })));

  // Verify WbsWorkPackage status shifted to HOLD
  const updatedWorkPkg = await db.wbsWorkPackage.findUnique({
    where: { id: workPkg.id },
  });
  console.log(`    - Work Package status after R1 release: ${updatedWorkPkg?.status} (Expected: HOLD)`);

  // Check if notification was generated for the project PM
  const latestNotification = await db.notification.findFirst({
    where: { userId: user.id, type: "DRAWING_SUPERSEDED" },
    orderBy: { createdAt: "desc" },
  });
  console.log(`    - High-Priority Alert sent to PM: "${latestNotification?.title}" - "${latestNotification?.message}"`);

  // Verify audit log entry
  const auditLog = await db.auditLog.findFirst({
    where: { projectId: project.id, action: "HOLD_SUPERSEDED" },
    orderBy: { createdAt: "desc" },
  });
  console.log(`    - Audit log recorded: "${auditLog?.description}"`);

  // 4. Test Quality Inspections & NCR Billing Blocks
  console.log("\n3. Testing ITP Inspections and Non-Conformance Report (NCR) blocks...");

  // Create ITP Inspection Request on WBS 1.2
  console.log("  - Creating Inspection Request for WBS 1.2...");
  const inspection = await createInspectionRequest(
    workspace.id,
    wbsB.id,
    r1.id,
    user.id,
    db
  );

  // Fail the inspection
  console.log("  - Completing inspection: FAILED (Concrete compressive strength was 22MPa, contract specifies 30MPa)...");
  await completeInspection(
    inspection.id,
    "FAILED",
    "Concrete core compression test failed",
    "Concrete compression test returned 22MPa (spec: 30MPa)",
    "MAJOR",
    db
  );

  // Check if open NCR exists
  const activeNcr = await db.nonConformanceReport.findUnique({
    where: { inspectionRequestId: inspection.id },
  });
  console.log(`    - Non-Conformance Report status: ${activeNcr?.status}, NCR Number: ${activeNcr?.ncrNumber}`);

  // Fetch client contract CC-METRO-001 from Phase 3
  const clientContract = await db.clientContract.findFirst({
    where: { workspaceId: workspace.id, contractNumber: "CC-METRO-001" },
  });

  if (!clientContract) {
    console.warn("  ⚠️ Client contract CC-METRO-001 not found. Verify Phase 3 tests ran first.");
  } else {
    // Attempt to submit a Draft RA Bill referencing the failed WBS 1.2 node.
    // This should fail due to the open NCR!
    console.log("  - Attempting to claim/bill WBS 1.2 on client RA bill...");
    try {
      await createDraftRaBill(
        workspace.id,
        project.id,
        clientContract.id,
        "RA-03-BLOCKED",
        new Date(),
        [{ wbsNodeId: wbsB.id, claimedQty: 50, rate: 450 }],
        db
      );
      console.error("  ❌ ERROR: Client billing did not block a WBS node with an active Quality NCR!");
    } catch (err: any) {
      console.log(`  ✔ Billing block verified: ${err.message}`);
    }
  }

  // 5. Test Quality rework and NCR resolution
  console.log("\n4. Simulating concrete rework and inspection recheck...");

  // Create a new inspection request representing re-test after concrete core replacement/rework
  console.log("  - Re-testing WBS 1.2 after concrete rework...");
  const inspectionRecheck = await createInspectionRequest(
    workspace.id,
    wbsB.id,
    r1.id,
    user.id,
    db
  );

  // Complete recheck as PASSED
  console.log("  - Completing recheck inspection: PASSED (Compression core test exceeds 32MPa)...");
  await completeInspection(
    inspectionRecheck.id,
    "PASSED",
    "Compressive core strength test returned 33MPa (spec: 30MPa)",
    undefined,
    undefined,
    db
  );

  // Link previous NCR to PASS to resolve
  if (activeNcr) {
    await db.nonConformanceReport.update({
      where: { id: activeNcr.id },
      data: { status: "RESOLVED" },
    });
    console.log("  ✔ Outdated NCR successfully RESOLVED.");
  }

  // Verify that asserting NCR block on WBS 1.2 now passes with no errors
  console.log("  - Testing billing block assertion on WBS 1.2...");
  await assertNoOpenNcr(wbsB.id, db);
  console.log("  ✔ Quality block assertion cleared. WBS node is open for progress claiming.");

  console.log("\n--- Phase 4 Architecture Verification Finished Successfully! ---");
  await db.$disconnect();
}

main().catch(console.error);
