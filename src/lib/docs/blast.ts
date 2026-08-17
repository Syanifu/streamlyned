import { db } from "../db";
import { registerHandler } from "../events/outbox";

/**
 * Outbox Event Handler for "drawing.revision_released".
 * Scans active work packages linked to older, now-superseded drawing revisions
 * and places them on HOLD to prevent construction errors on site.
 */
export async function drawingRevisionReleasedHandler(
  workspaceId: string,
  payload: { revisionId: string; drawingId: string; drawingNumber: string; revisionNumber: string }
) {
  const { revisionId, drawingId, drawingNumber, revisionNumber } = payload;

  await db.$transaction(async (tx) => {
    // 1. Find all other (older) revisions of this drawing
    const olderRevisions = await tx.drawingRevision.findMany({
      where: {
        drawingId,
        id: { not: revisionId },
      },
      select: { id: true, revisionNumber: true },
    });

    const olderRevisionIds = olderRevisions.map((r: { id: string }) => r.id);
    if (olderRevisionIds.length === 0) return; // First revision, nothing to supersede

    // 2. Query active WbsWorkPackages using those superseded revision IDs
    const activeOutdatedPackages = await tx.wbsWorkPackage.findMany({
      where: {
        drawingRevisionId: { in: olderRevisionIds },
        status: "ACTIVE",
      },
      include: {
        wbsNode: {
          include: {
            project: true,
          },
        },
      },
    });

    if (activeOutdatedPackages.length === 0) return;

    console.log(
      `    [BlastRadius] Found ${activeOutdatedPackages.length} active WBS work fronts working off outdated drawing versions.`
    );

    // 3. Mark active outdated work packages on HOLD and notify project members
    for (const pkg of activeOutdatedPackages) {
      // Place work package on HOLD
      await tx.wbsWorkPackage.update({
        where: { id: pkg.id },
        data: { status: "HOLD" },
      });

      // Fetch WbsNode details
      const nodeCode = pkg.wbsNode.code;
      const nodeName = pkg.wbsNode.name;
      const projectId = pkg.wbsNode.projectId;

      // Find project members/managers to notify
      const projectMembers = await tx.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      });

      const userIds = projectMembers.map((m: { userId: string }) => m.userId);

      // Create high-priority alerts for these users
      for (const userId of userIds) {
        await tx.notification.create({
          data: {
            workspaceId,
            userId,
            type: "DRAWING_SUPERSEDED",
            title: `HOLD: Outdated Drawing on WBS ${nodeCode}`,
            message: `Drawing ${drawingNumber} has been revised to ${revisionNumber}. Active work front "${nodeName}" has been placed on HOLD.`,
            targetUrl: `/dashboard/drawings`,
            priority: "P1",
          },
        });
      }

      // Log to Audit Log
      const firstUserInDb = await tx.user.findFirst({ select: { id: true } });
      const logUserId = userIds[0] || firstUserInDb?.id || "unknown";

      await tx.auditLog.create({
        data: {
          workspaceId,
          projectId,
          entityType: "WBS_WORK_PACKAGE",
          entityId: pkg.id,
          userId: logUserId,
          action: "HOLD_SUPERSEDED",
          description: `Work Package for WBS ${nodeCode} placed on HOLD due to new Drawing Revision ${revisionNumber} release.`,
          priority: "P1",
        },
      });
    }
  });
}

// Register the handler with the outbox router
registerHandler("drawing.revision_released", drawingRevisionReleasedHandler);
