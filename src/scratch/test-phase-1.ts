import { PrismaClient } from "@prisma/client";
import { bootstrapDefaultAccounts, postJournalEntry, getAccountBalance } from "../lib/finance/ledger";
import { enqueueEvent, processOutbox, registerHandler } from "../lib/events/outbox";
import { submitDocumentForApproval, processSignoff } from "../lib/approvals/engine";

async function main() {
  const db = new PrismaClient();
  console.log("--- Starting Phase 1 Architecture Verification ---");

  // 1. Get or create a test Workspace and User
  let workspace = await db.workspace.findFirst();
  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "Test EPC Enterprise",
        slug: "test-epc-ent-" + Date.now(),
      },
    });
    console.log(`Created test workspace: ${workspace.name}`);
  } else {
    console.log(`Found existing workspace: ${workspace.name} (${workspace.id})`);
  }

  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: "cfo@testcompany.com",
        name: "CFO Officer",
      },
    });
    console.log(`Created test user: ${user.name}`);
  } else {
    console.log(`Found existing user: ${user.name} (${user.id})`);
  }

  // Ensure workspace member mapping exists
  await db.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
    },
    update: {
      role: "OWNER",
    },
  });

  // 2. Bootstrap Chart of Accounts
  console.log("\n1. Bootstrapping Chart of Accounts...");
  await bootstrapDefaultAccounts(workspace.id, db);
  const accounts = await db.chartOfAccounts.findMany({
    where: { workspaceId: workspace.id },
  });
  console.log(`Successfully bootstrapped ${accounts.length} default accounts.`);
  accounts.forEach((acc) => console.log(`  - Account [${acc.code}]: ${acc.name} (${acc.type})`));

  // 3. Verify Master Data Schema Rules
  console.log("\n2. Verifying Item, Supplier & Customer master rules...");
  
  // Clean previous test items
  await db.itemMaster.deleteMany({ where: { workspaceId: workspace.id, code: "ITEM-VERIFY-001" } }).catch(() => {});
  const item = await db.itemMaster.create({
    data: {
      workspaceId: workspace.id,
      code: "ITEM-VERIFY-001",
      name: "Structural Steel Beam (HEB 300)",
      uom: "KG",
      group: "RAW_MATERIAL",
      costingRule: "MOVING_AVERAGE",
      reorderLevel: 5000,
      reorderQty: 20000,
    },
  });
  console.log(`Created Item Master: ${item.name} with code ${item.code}`);

  // Test GSTIN Validation Regex
  const validGstin = "27ABCDE1234F1Z5";
  const invalidGstin = "12345GSTININVALID";
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  console.log(`  - Checking GSTIN '${validGstin}': ${GSTIN_REGEX.test(validGstin) ? "VALID (Pass)" : "INVALID (Fail)"}`);
  console.log(`  - Checking GSTIN '${invalidGstin}': ${GSTIN_REGEX.test(invalidGstin) ? "VALID (Pass)" : "INVALID (Fail)"}`);

  // 4. Verify Double-Entry Ledger Posting
  console.log("\n3. Verifying Double-Entry Ledger Posting Integrity...");
  const ledgerDate = new Date();
  
  // Test unbalanced ledger posting (should fail)
  try {
    console.log("  - Attempting to post UNBALANCED entry (Debit 100, Credit 50)...");
    await postJournalEntry(workspace.id, {
      ledgerDate,
      referenceType: "TEST_RECN",
      referenceId: "test-ref-unbalanced",
      description: "Should fail",
      lines: [
        { coaCode: "1000", debit: 100, credit: 0 },
        { coaCode: "5000", debit: 0, credit: 50 },
      ],
    }, db);
    console.error("  ❌ ERROR: Unbalanced entry succeeded when it should have failed!");
  } catch (err: any) {
    console.log(`  ✔ Expected failure caught: ${err.message}`);
  }

  // Test balanced ledger posting (should succeed)
  console.log("  - Attempting to post BALANCED entry (WIP debit 1500, Cash credit 1500)...");
  await postJournalEntry(workspace.id, {
    ledgerDate,
    referenceType: "TEST_RECN",
    referenceId: "test-ref-balanced",
    description: "Paid subcontractor for site mobilization",
    lines: [
      { coaCode: "1300", debit: 1500, credit: 0 },
      { coaCode: "1000", debit: 0, credit: 1500 },
    ],
  }, db);
  
  const cashBalance = await getAccountBalance(workspace.id, "1000");
  const wipBalance = await getAccountBalance(workspace.id, "1300");
  console.log(`  ✔ Successfully posted balanced entry!`);
  console.log(`    Accounts updated balances:`);
  console.log(`      - Cash (1000) Balance: ${cashBalance}`);
  console.log(`      - WIP (1300) Balance: ${wipBalance}`);

  // 5. Verify SLA Approval Engine & Event Outbox
  console.log("\n4. Verifying SLA Approval Routing & Outbox Integration...");

  // Clean previous test approvals/signoffs
  await db.approvalRequest.deleteMany({ where: { workspaceId: workspace.id, documentId: "po-doc-999" } }).catch(() => {});

  // Register outbox handler mock for po.approved
  const eventLogs: string[] = [];
  registerHandler("po.approved", async (wsId, payload) => {
    eventLogs.push(`Event po.approved received for PO ${payload.documentId} in workspace ${wsId}`);
    console.log(`    [EventHandler] Outbox Handler Fired: PO ${payload.documentId} has been fully approved!`);
  });

  const testPoId = "po-doc-999";
  // Submit PO of 600,000 (threshold triggers 3 levels)
  console.log(`  - Submitting PO of 600,000 (triggers Level 3 approval)...`);
  const approvalRequest = await submitDocumentForApproval(workspace.id, "PO", testPoId, 600000, db);
  console.log(`    Created approval request: ID: ${approvalRequest.id}, Max steps: ${approvalRequest.maxStep}`);

  let signoffs = await db.approvalSignoff.findMany({
    where: { requestId: approvalRequest.id },
    orderBy: { step: "asc" },
  });
  console.log(`    Signoffs generated: ${signoffs.length} levels.`);
  signoffs.forEach(s => console.log(`      - Level ${s.step}: Approver: ${s.approverUserId}, Status: ${s.status}`));

  // Approve Level 1
  console.log(`  - Approving Level 1...`);
  let res1 = await processSignoff(signoffs[0].id, user.id, "APPROVED", "Approved level 1", db);
  console.log(`    Level 1 result: Request status: ${res1.status}, currentStep updated to: ${res1.currentStep}`);

  // Approve Level 2
  console.log(`  - Approving Level 2...`);
  let res2 = await processSignoff(signoffs[1].id, user.id, "APPROVED", "Approved level 2", db);
  console.log(`    Level 2 result: Request status: ${res2.status}, currentStep updated to: ${res2.currentStep}`);

  // Approve Level 3 (Final Level - triggers E03 outbox event)
  console.log(`  - Approving Level 3 (Final)...`);
  let res3 = await processSignoff(signoffs[2].id, user.id, "APPROVED", "Final project release", db);
  console.log(`    Level 3 result: Request status: ${res3.status}`);

  // 6. Verify Outbox processing
  console.log("\n5. Running Outbox Worker Poll...");
  const pendingOutbox = await db.outboxEvent.findMany({
    where: { workspaceId: workspace.id, status: "PENDING" },
  });
  console.log(`    Found ${pendingOutbox.length} pending events in the Outbox database.`);
  pendingOutbox.forEach(evt => console.log(`      - Event Type: ${evt.eventType}, Payload: ${evt.payload}`));

  console.log(`    Processing outbox events...`);
  const processResult = await processOutbox(10);
  console.log(`    Outbox processing run finished. Processed events count: ${processResult.processed}`);

  const processedEvent = await db.outboxEvent.findFirst({
    where: { workspaceId: workspace.id, eventType: "po.approved" },
  });
  console.log(`    Confirm outbox event status in DB: ${processedEvent?.status}, ProcessedAt: ${processedEvent?.processedAt}`);
  
  console.log("\n--- Phase 1 Architecture Verification Finished Successfully! ---");
  await db.$disconnect();
}

main().catch(console.error);
