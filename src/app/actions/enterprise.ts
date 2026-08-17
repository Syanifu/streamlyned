"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Import core logic engines
import { postMaterialIssue, getStockBalance } from "@/lib/inventory/ledger";
import { createClientContract } from "@/lib/sales/contract";
import { createDraftRaBill, certifyRaBill } from "@/lib/sales/billing";
import { createDrawingDocument, createDrawingRevision, releaseDrawingRevision } from "@/lib/docs/drawings";
import { createInspectionRequest, completeInspection } from "@/lib/qc/inspections";
import { createCommissioningSystem, createCommissioningLoop, completeCommissioningLoop } from "@/lib/commissioning/handover";
import { createMaintenanceWorkOrder } from "@/lib/assets/register";
import { calculateProjectEVM, checkLowInventory } from "@/lib/analytics/engine";

// Helper to assert member access
async function verifyProjectMember(projectId: string, userId: string) {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new Error("Unauthorized access to this project.");
  return member;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getProjectInventoryData(projectId: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    // Fetch WBS Nodes, Inventory Movements, Item Masters
    const [wbsNodes, movements, items] = await Promise.all([
      db.wbsNode.findMany({
        where: { projectId },
        orderBy: { code: "asc" },
      }),
      db.inventoryMovement.findMany({
        where: { workspaceId: session.workspace.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.itemMaster.findMany({
        where: { workspaceId: session.workspace.id, isActive: true },
        orderBy: { code: "asc" },
      }),
    ]);

    // Calculate current stock for all active items
    const stockBalances = await Promise.all(
      items.map(async (item) => {
        const stock = await getStockBalance(session.workspace.id, item.code, "MAIN", db);
        return {
          code: item.code,
          name: item.name,
          uom: item.uom,
          group: item.group,
          quantity: stock.quantity,
          rate: stock.rate,
        };
      })
    );

    return { success: true, wbsNodes, movements, stockBalances };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function postMaterialIssueAction(
  projectId: string,
  wbsNodeId: string,
  lines: { itemCode: string; quantity: number }[],
  warehouse = "MAIN"
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await postMaterialIssue(
      session.workspace.id,
      projectId,
      wbsNodeId,
      lines,
      warehouse,
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCUREMENT & BILLING ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getProcurementBillingData(projectId: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const [contracts, raBills, pos, wbsNodes] = await Promise.all([
      db.clientContract.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
      db.raBill.findMany({
        where: { projectId },
        orderBy: { billingDate: "desc" },
      }),
      db.purchaseOrder.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
      db.wbsNode.findMany({
        where: { projectId },
        orderBy: { code: "asc" },
      }),
    ]);

    return { success: true, contracts, raBills, pos, wbsNodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createClientContractAction(
  projectId: string,
  contractCode: string,
  clientName: string,
  totalValue: number,
  advancePercentage: number,
  recoveryPercentage: number,
  retentionPercentage: number
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await createClientContract(
      session.workspace.id,
      projectId,
      contractCode,
      clientName,
      totalValue,
      advancePercentage,
      recoveryPercentage,
      retentionPercentage,
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createDraftRaBillAction(
  projectId: string,
  contractId: string,
  billingDateStr: string,
  claims: { wbsNodeId: string; quantityClaimed: number; rate: number }[]
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const billNumber = `BILL-${Date.now().toString().slice(-6)}`;
    const items = claims.map((c) => ({
      wbsNodeId: c.wbsNodeId,
      claimedQty: c.quantityClaimed,
      rate: c.rate,
    }));

    const bill = await createDraftRaBill(
      session.workspace.id,
      projectId,
      contractId,
      billNumber,
      new Date(billingDateStr),
      items,
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, billId: bill.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function certifyRaBillAction(projectId: string, billId: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const bill = await db.raBill.findUnique({
      where: { id: billId },
      include: { items: true },
    });
    if (!bill) throw new Error("RA Bill not found.");

    const certifiedItems = bill.items.map((item: any) => ({
      itemId: item.id,
      certifiedQty: item.quantityClaimed,
    }));

    await certifyRaBill(billId, certifiedItems, db);

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWING & QC ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDrawingsQcData(projectId: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const [drawings, transmittals, inspections, ncrs, wbsNodes] = await Promise.all([
      db.drawingDocument.findMany({
        where: { projectId },
        orderBy: { drawingNumber: "asc" },
        include: { revisions: true },
      }),
      db.drawingTransmittal.findMany({
        where: { projectId },
        orderBy: { transmittalNumber: "desc" },
        include: { items: true },
      }),
      db.itpInspectionRequest.findMany({
        where: { wbsNode: { projectId } },
        orderBy: { createdAt: "desc" },
        include: { wbsNode: true },
      }),
      db.nonConformanceReport.findMany({
        where: { workspaceId: session.workspace.id, wbsNode: { projectId } },
        orderBy: { createdAt: "desc" },
        include: { wbsNode: true },
      }),
      db.wbsNode.findMany({
        where: { projectId },
        orderBy: { code: "asc" },
      }),
    ]);

    return { success: true, drawings, transmittals, inspections, ncrs, wbsNodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

import { createDrawingTransmittal } from "@/lib/docs/drawings";

export async function createDrawingDocumentAction(
  projectId: string,
  drawingNumber: string,
  title: string,
  discipline: string,
  revisionNumber: string
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const doc = await createDrawingDocument(
      session.workspace.id,
      projectId,
      drawingNumber,
      title,
      discipline,
      db
    );

    await createDrawingRevision(
      doc.id,
      revisionNumber,
      "http://example.com/dwg.pdf",
      1024,
      "DRAFT",
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function releaseDrawingRevisionAction(
  projectId: string,
  drawingId: string,
  revisionNumber: string,
  wbsCodes: string[]
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await db.$transaction(async (tx) => {
      // 1. Create drawing revision in DRAFT status
      const revision = await createDrawingRevision(
        drawingId,
        revisionNumber,
        "http://example.com/dwg.pdf",
        1024,
        "DRAFT",
        tx
      );

      // 2. Map transmitted WBS Nodes to the revision
      for (const code of wbsCodes) {
        const node = await tx.wbsNode.findUnique({
          where: { projectId_code: { projectId, code } },
        });
        if (node) {
          await tx.wbsWorkPackage.create({
            data: {
              wbsNodeId: node.id,
              drawingRevisionId: revision.id,
              status: "ACTIVE",
            },
          });
        }
      }

      // 3. Release revision (this supersedes older revisions and fires events)
      await releaseDrawingRevision(revision.id, tx);

      // 4. Log drawing distribution transmittal
      const transmittalNo = `TR-${Date.now().toString().slice(-6)}`;
      await createDrawingTransmittal(
        session.workspace.id,
        projectId,
        transmittalNo,
        "pm@streamlyned.com",
        [revision.id],
        tx
      );
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createItpInspectionAction(
  projectId: string,
  wbsNodeId: string,
  checklistTitle: string,
  checklistItemsJson: string
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    // ITP inspection request in the database doesn't store title/items directly,
    // we record it as part of drawingRevisionId: null and log details
    await createInspectionRequest(
      session.workspace.id,
      wbsNodeId,
      null, // drawingRevisionId
      session.user.id,
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeInspectionAction(
  projectId: string,
  requestId: string,
  status: "PASSED" | "FAILED",
  remarks: string
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await completeInspection(
      requestId,
      status,
      remarks,
      remarks, // ncrDescription
      "MINOR", // severity
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resolveNcrAction(projectId: string, ncrId: string, disposition: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await db.nonConformanceReport.update({
      where: { id: ncrId },
      data: { status: "RESOLVED", disposition },
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// COMMISSIONING & ANALYTICS ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAnalyticsCommissioningData(projectId: string) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    const [evm, warnings, systems, assetTags, workOrders, wbsNodes] = await Promise.all([
      calculateProjectEVM(projectId, db),
      checkLowInventory(session.workspace.id, db),
      db.commissioningSystem.findMany({
        where: { projectId },
        include: { loops: true },
        orderBy: { systemCode: "asc" },
      }),
      db.assetTag.findMany({
        where: { projectId },
        orderBy: { assetCode: "asc" },
      }),
      db.maintenanceWorkOrder.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        include: { asset: true },
      }),
      db.wbsNode.findMany({
        where: { projectId },
        orderBy: { code: "asc" },
      }),
    ]);

    return { success: true, evm, warnings, systems, assetTags, workOrders, wbsNodes };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeLoopAction(
  projectId: string,
  loopId: string,
  status: "PASSED" | "FAILED"
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await completeCommissioningLoop(loopId, status, session.user.name, db);

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createWorkOrderAction(
  projectId: string,
  wbsNodeId: string,
  assetId: string,
  woNumber: string,
  title: string,
  description: string,
  spares: { itemCode: string; qty: number }[]
) {
  try {
    const session = await requireSession();
    await verifyProjectMember(projectId, session.user.id);

    await createMaintenanceWorkOrder(
      session.workspace.id,
      projectId,
      wbsNodeId,
      assetId,
      woNumber,
      title,
      description,
      spares,
      db
    );

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
