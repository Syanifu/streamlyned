import { db } from "../db";
import { enqueueEvent } from "../events/outbox";

/**
 * Creates a new Quality ITP Inspection Request.
 */
export async function createInspectionRequest(
  workspaceId: string,
  wbsNodeId: string,
  drawingRevisionId: string | null,
  inspectorUserId: string,
  tx?: any
) {
  const client = tx || db;

  return await client.itpInspectionRequest.create({
    data: {
      workspaceId,
      wbsNodeId,
      drawingRevisionId,
      inspectorUserId,
      status: "PENDING",
    },
  });
}

/**
 * Completes an inspection check-list.
 * If status is FAILED, generates an active Non-Conformance Report (NCR).
 */
export async function completeInspection(
  inspectionId: string,
  status: "PASSED" | "FAILED",
  resultComment: string,
  ncrDescription?: string,
  severity?: "MINOR" | "MAJOR",
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    const request = await transactionClient.itpInspectionRequest.findUnique({
      where: { id: inspectionId },
      include: { wbsNode: true, ncr: true },
    });

    if (!request || request.status !== "PENDING") {
      throw new Error(`ITP Inspection Request ${inspectionId} not found or already completed.`);
    }

    // 1. Update Inspection details
    const completedRequest = await transactionClient.itpInspectionRequest.update({
      where: { id: inspectionId },
      data: {
        status,
        resultComment,
        inspectedAt: new Date(),
      },
    });

    // 2. Handle NCR creation or resolution
    if (status === "FAILED") {
      const ncrNumber = `NCR-${request.wbsNode.code}-${Date.now().toString().slice(-6)}`;
      const ncr = await transactionClient.nonConformanceReport.create({
        data: {
          workspaceId: request.workspaceId,
          inspectionRequestId: inspectionId,
          ncrNumber,
          wbsNodeId: request.wbsNodeId,
          description: ncrDescription || `Failed inspection check: ${resultComment}`,
          severity: severity || "MINOR",
          status: "OPEN",
        },
      });

      // Enqueue outbox event "qc.ncr_opened"
      await enqueueEvent(
        request.workspaceId,
        "qc.ncr_opened",
        { inspectionId, ncrId: ncr.id, ncrNumber, wbsNodeId: request.wbsNodeId },
        transactionClient
      );
    } else if (status === "PASSED" && request.ncr) {
      // Resolve existing open NCR
      await transactionClient.nonConformanceReport.update({
        where: { id: request.ncr.id },
        data: { status: "RESOLVED", disposition: "USE_AS_IS" },
      });

      // Enqueue outbox event "qc.ncr_resolved"
      await enqueueEvent(
        request.workspaceId,
        "qc.ncr_resolved",
        { inspectionId, ncrId: request.ncr.id, wbsNodeId: request.wbsNodeId },
        transactionClient
      );
    }

    return completedRequest;
  });
}

/**
 * Checks if a WBS Node has any unresolved Quality NCRs blocking audits.
 */
export async function checkWbsBlockStatus(
  wbsNodeId: string,
  tx?: any
): Promise<{ blocked: boolean; ncrNumber?: string; description?: string }> {
  const client = tx || db;

  const openNcr = await client.nonConformanceReport.findFirst({
    where: {
      wbsNodeId,
      status: "OPEN",
    },
    select: { ncrNumber: true, description: true },
  });

  if (openNcr) {
    return {
      blocked: true,
      ncrNumber: openNcr.ncrNumber,
      description: openNcr.description,
    };
  }

  return { blocked: false };
}

/**
 * Asserts that a WBS Node has no active Quality NCRs blocking progress/billing.
 */
export async function assertNoOpenNcr(wbsNodeId: string, tx?: any) {
  const client = tx || db;
  const check = await checkWbsBlockStatus(wbsNodeId, client);

  if (check.blocked) {
    throw new Error(
      `Quality Block: WBS Node has an active Non-Conformance Report (${check.ncrNumber}: ${check.description}). Progress claiming and billing is blocked until resolved.`
    );
  }
}
