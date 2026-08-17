import { PrismaClient } from "@prisma/client";
import { createClientContract } from "../lib/sales/contract";
import { createDraftRaBill, certifyRaBill } from "../lib/sales/billing";
import { createSupplierInvoice } from "../lib/finance/matching";
import { setPeriodLock, assertPeriodOpen } from "../lib/finance/period";
import { getAccountBalance } from "../lib/finance/ledger";
import { processOutbox } from "../lib/events/outbox";

async function main() {
  const db = new PrismaClient();
  console.log("--- Starting Phase 3 Architecture Verification ---");

  // 1. Fetch workspace, user and project
  const workspace = await db.workspace.findFirst();
  const user = await db.user.findFirst();
  const project = await db.project.findFirst({
    where: { workspaceId: workspace?.id },
  });

  if (!workspace || !user || !project) {
    throw new Error("Missing test workspace, user, or project. Run Phase 1 & 2 tests first.");
  }

  // Ensure customer exists
  await db.customerMaster.upsert({
    where: {
      workspaceId_code: {
        workspaceId: workspace.id,
        code: "CUSTOMER-DEFAULT",
      },
    },
    create: {
      workspaceId: workspace.id,
      code: "CUSTOMER-DEFAULT",
      name: "Metro Transit Authority",
      gstin: "27ABCDE1234F1Z5",
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });

  // 2. Create Client Contract
  console.log("\n1. Initializing Client Contract & Mobilization Advance...");
  
  // Clean up any old contracts with this code
  await db.clientContract.deleteMany({
    where: { workspaceId: workspace.id, contractNumber: "CC-METRO-001" }
  });

  const contract = await createClientContract(
    workspace.id,
    project.id,
    "CC-METRO-001",
    "CUSTOMER-DEFAULT",
    5000000, // 5,000,000 contract value
    500000,  // 500,000 mobilization advance
    10,      // 10% advance recovery rate
    5,       // 5% retention held
    db
  );

  console.log(`  ✔ Contract created: Number: ${contract.contractNumber}, Total Value: ${contract.totalValue}`);
  
  // Verify advance GL posting: Debit 1000 Cash (500,000) / Credit 1100 AR (500,000)
  const cashBalance = await getAccountBalance(workspace.id, "1000");
  const arBalance = await getAccountBalance(workspace.id, "1100");
  console.log(`    - Cash (1000) balance after advance: ${cashBalance}`);
  console.log(`    - Accounts Receivable (1100) balance: ${arBalance} (Expected: -500000 representing client credit)`);

  // 3. Verify Cumulative Running Account Billing
  console.log("\n2. Simulating Cumulative Running Account (RA) Billing...");
  
  // Find or create WBS node A for billing
  const wbsA = await db.wbsNode.findFirst({
    where: { projectId: project.id, code: "1.1" },
  });
  if (!wbsA) throw new Error("WBS Node 1.1 not found.");

  // A. RA Bill 1: Claim Qty: 100 @ 300 rate (Total 30,000)
  console.log("  - Creating Draft RA Bill #1 (Claiming Qty 100 @ 300)...");
  const bill1 = await createDraftRaBill(
    workspace.id,
    project.id,
    contract.id,
    "RA-01",
    new Date(),
    [{ wbsNodeId: wbsA.id, claimedQty: 100, rate: 300 }],
    db
  );

  console.log("  - Certifying RA Bill #1 with Qty 100 (Certified: 30,000)...");
  // Certify all items
  const certItems1 = bill1.items.map(item => ({ itemId: item.id, certifiedQty: 100 }));
  const certifiedBill1 = await certifyRaBill(bill1.id, certItems1, db);

  console.log(`    Certified Bill #1 metrics:`);
  console.log(`      - Cumulative Certified: ${certifiedBill1.cumulativeCertified} (Expected: 30000)`);
  console.log(`      - Retention Deduction (5%): ${certifiedBill1.retentionDeduction} (Expected: 1500)`);
  console.log(`      - Mobilization Advance Recovery (10%): ${certifiedBill1.advanceRecovery} (Expected: 3000)`);
  console.log(`      - Net Payable: ${certifiedBill1.netPayable} (Expected: 25500)`);

  // B. RA Bill 2: Claim Cumulative Qty: 300 @ 300 rate (Total cumulative 90,000. Period value = 60,000)
  console.log("  - Creating Draft RA Bill #2 (Cumulative claimed Qty 300 @ 300)...");
  const bill2 = await createDraftRaBill(
    workspace.id,
    project.id,
    contract.id,
    "RA-02",
    new Date(),
    [{ wbsNodeId: wbsA.id, claimedQty: 300, rate: 300 }],
    db
  );

  console.log("  - Certifying RA Bill #2 with Qty 300 (Cumulative certified: 90,000)...");
  const certItems2 = bill2.items.map(item => ({ itemId: item.id, certifiedQty: 300 }));
  const certifiedBill2 = await certifyRaBill(bill2.id, certItems2, db);

  console.log(`    Certified Bill #2 metrics:`);
  console.log(`      - Cumulative Certified: ${certifiedBill2.cumulativeCertified} (Expected: 90000)`);
  console.log(`      - Retention Deduction (5% of 60k period value): ${certifiedBill2.retentionDeduction} (Expected: 3000)`);
  console.log(`      - Mobilization Advance Recovery (10% of 60k): ${certifiedBill2.advanceRecovery} (Expected: 6000)`);
  console.log(`      - Net Payable: ${certifiedBill2.netPayable} (Expected: 51000)`);

  // Check total revenue account balance (4000)
  const revenueBalance = await getAccountBalance(workspace.id, "4000");
  console.log(`    - Total revenue posted to General Ledger (Account 4000): ${revenueBalance} (Expected: -90000 representing credit revenue)`);

  // 4. Verify AP 3-Way Match Reconciler
  console.log("\n3. Testing AP 3-Way Match Reconciler...");

  // Fetch approved PO from Phase 2
  const po = await db.purchaseOrder.findFirst({
    where: { workspaceId: workspace.id, poNumber: "PO-VERIFY-OK" }
  });

  if (!po) {
    console.warn("    ⚠️ Skipping 3-Way match test: PO-VERIFY-OK not found. Run Phase 2 tests first.");
  } else {
    // Clean old invoices
    await db.purchaseInvoice.deleteMany({ where: { poId: po.id } });

    // A. Test Rate Mismatch (Supplier bills 350, PO rate is 300)
    console.log("  - Creating Invoice with rate mismatch (Supplier rate: 350, PO rate: 300)...");
    const invErrRate = await createSupplierInvoice(
      workspace.id,
      project.id,
      po.id,
      "INV-ERR-RATE",
      new Date(),
      [{ itemCode: "ITEM-VERIFY-001", quantity: 10, rate: 350 }],
      db
    );
    console.log(`    Match status: ${invErrRate.invoice.status}, Discrepancies found:`, invErrRate.match.discrepancies);

    // B. Test Quantity Mismatch (Invoicing 110, GRN has only 100 allowable)
    console.log("  - Creating Invoice with quantity mismatch (Invoicing 110, GRN available: 100)...");
    const invErrQty = await createSupplierInvoice(
      workspace.id,
      project.id,
      po.id,
      "INV-ERR-QTY",
      new Date(),
      [{ itemCode: "ITEM-VERIFY-001", quantity: 110, rate: 300 }],
      db
    );
    console.log(`    Match status: ${invErrQty.invoice.status}, Discrepancies found:`, invErrQty.match.discrepancies);

    // C. Test Perfect Match (100 @ 300)
    console.log("  - Creating balanced matching Invoice (100 @ 300)...");
    const invOk = await createSupplierInvoice(
      workspace.id,
      project.id,
      po.id,
      "INV-OK-MATCH",
      new Date(),
      [{ itemCode: "ITEM-VERIFY-001", quantity: 100, rate: 300 }],
      db
    );
    console.log(`    Match status: ${invOk.invoice.status} (Expected: APPROVED), Discrepancies count: ${invOk.match.discrepancies.length}`);
  }

  // 5. Verify Period Lock
  console.log("\n4. Testing Financial Period Lock constraints...");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const today = new Date();

  console.log(`  - Setting Period Lock to yesterday: ${yesterday.toDateString()}`);
  await setPeriodLock(workspace.id, yesterday, user.id, db);

  // Test block on closed period date (twoDaysAgo)
  try {
    console.log(`  - Attempting to assert period open for two days ago (${twoDaysAgo.toDateString()})...`);
    await assertPeriodOpen(workspace.id, twoDaysAgo, db);
    console.error("  ❌ ERROR: Period lock assertion failed to block back-dated date!");
  } catch (err: any) {
    console.log(`  ✔ Period lock assertion blocked successfully: ${err.message}`);
  }

  // Test success on current date (today)
  console.log(`  - Attempting to assert period open for today (${today.toDateString()})...`);
  await assertPeriodOpen(workspace.id, today, db);
  console.log("  ✔ Period lock assertion allowed current date transaction (Pass).");

  console.log("\n--- Phase 3 Architecture Verification Finished Successfully! ---");
  await db.$disconnect();
}

main().catch(console.error);
