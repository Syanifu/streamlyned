import { db } from "../db";
import { enqueueEvent } from "../events/outbox";

/**
 * Submits a document (MR, PO, etc.) for approval.
 * Determines the routing dynamically based on the total cost/amount.
 */
export async function submitDocumentForApproval(
  workspaceId: string,
  documentType: string,
  documentId: string,
  amount: number,
  tx?: any
) {
  const client = tx || db;

  // 1. Determine approval routing rules based on amount:
  // - Level 1: Under 50,000 INR/USD (Requires 1 level)
  // - Level 2: 50,000 to 500,000 INR/USD (Requires 2 levels)
  // - Level 3: Over 500,000 INR/USD (Requires 3 levels)
  let maxStep = 1;
  if (amount >= 500000) {
    maxStep = 3;
  } else if (amount >= 50000) {
    maxStep = 2;
  }

  // 2. Resolve approvers for each level from workspace members
  const members = await client.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
  });

  const owners = members.filter((m: any) => m.role === "OWNER");
  const admins = members.filter((m: any) => m.role === "ADMIN");
  const regularMembers = members.filter((m: any) => m.role === "MEMBER");

  // Fallback chain: Owner is always the absolute fallback for any level
  const defaultOwnerId = owners[0]?.userId || members[0]?.userId;
  const defaultAdminId = admins[0]?.userId || defaultOwnerId;
  const defaultMemberId = regularMembers[0]?.userId || defaultAdminId;

  if (!defaultOwnerId) {
    throw new Error("Cannot submit for approval: Workspace has no members.");
  }

  const approverMap: Record<number, string> = {
    1: defaultMemberId,  // PM Level
    2: defaultAdminId,   // Div Head Level
    3: defaultOwnerId,   // Executive/CFO Level
  };

  // Create the base approval request (upsert to handle retries cleanly)
  const request = await client.approvalRequest.upsert({
    where: {
      workspaceId_documentType_documentId: {
        workspaceId,
        documentType,
        documentId,
      },
    },
    create: {
      workspaceId,
      documentType,
      documentId,
      amount,
      status: "PENDING",
      currentStep: 1,
      maxStep,
    },
    update: {
      amount,
      status: "PENDING",
      currentStep: 1,
      maxStep,
    },
  });

  // Delete any stale signoffs if re-submitting
  await client.approvalSignoff.deleteMany({
    where: { requestId: request.id },
  });

  // Create signoff steps
  const signoffData = [];
  for (let step = 1; step <= maxStep; step++) {
    const approverUserId = approverMap[step] || defaultOwnerId;
    signoffData.push({
      requestId: request.id,
      step,
      approverUserId,
      status: "PENDING",
    });
  }

  await Promise.all(
    signoffData.map((data) => client.approvalSignoff.create({ data }))
  );

  return request;
}

/**
 * Handles processing of a single signoff step action.
 */
export async function processSignoff(
  signoffId: string,
  actorUserId: string,
  action: "APPROVED" | "REJECTED",
  comment?: string,
  tx?: any
) {
  const client = tx || db;

  // 1. Fetch signoff step details
  const signoff = await client.approvalSignoff.findUnique({
    where: { id: signoffId },
    include: {
      request: true,
    },
  });

  if (!signoff) {
    throw new Error("Approval signoff line not found.");
  }

  const { request } = signoff;

  // 2. Authorization check: must be the assigned approver
  if (signoff.approverUserId !== actorUserId) {
    throw new Error("Access Denied: You are not the authorized approver for this step.");
  }

  // 3. Status checks
  if (signoff.status !== "PENDING" || request.status !== "PENDING") {
    throw new Error(`This step has already been processed (${signoff.status}).`);
  }

  // 4. Sequential check: must be the active step
  if (signoff.step !== request.currentStep) {
    throw new Error(
      `Step out of order. Current active step is Level ${request.currentStep}, this is Level ${signoff.step}.`
    );
  }

  // 5. Update active signoff
  await client.approvalSignoff.update({
    where: { id: signoffId },
    data: {
      status: action,
      actionComment: comment || null,
      actedAt: new Date(),
    },
  });

  if (action === "REJECTED") {
    // If rejected, reject the entire request immediately
    await client.approvalRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
      },
    });

    // Cancel all subsequent steps
    await client.approvalSignoff.updateMany({
      where: {
        requestId: request.id,
        step: { gt: signoff.step },
      },
      data: {
        status: "REJECTED",
      },
    });

    // Enqueue document rejection outbox event (e.g. "purchase_order.rejected")
    await enqueueEvent(
      request.workspaceId,
      `${request.documentType.toLowerCase()}.rejected`,
      { documentId: request.documentId, reason: comment || "Rejected by approver" },
      client
    );

    return { status: "REJECTED", currentStep: request.currentStep };
  }

  // 6. Action is APPROVED: Check if there are remaining steps
  if (request.currentStep < request.maxStep) {
    const nextStep = request.currentStep + 1;
    await client.approvalRequest.update({
      where: { id: request.id },
      data: {
        currentStep: nextStep,
      },
    });

    return { status: "PENDING", currentStep: nextStep };
  } else {
    // Final level approved! Mark document as APPROVED
    await client.approvalRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
      },
    });

    // Enqueue document approval outbox event (e.g. "purchase_order.approved")
    await enqueueEvent(
      request.workspaceId,
      `${request.documentType.toLowerCase()}.approved`,
      { documentId: request.documentId },
      client
    );

    return { status: "APPROVED", currentStep: request.currentStep };
  }
}
