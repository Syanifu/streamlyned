import { db } from "../db";
import { enqueueEvent } from "../events/outbox";

/**
 * Registers an engineering drawing document registry.
 */
export async function createDrawingDocument(
  workspaceId: string,
  projectId: string,
  drawingNumber: string,
  title: string,
  discipline: string,
  tx?: any
) {
  const client = tx || db;

  return await client.drawingDocument.create({
    data: {
      workspaceId,
      projectId,
      drawingNumber: drawingNumber.trim().toUpperCase(),
      title: title.trim(),
      discipline: discipline.trim().toUpperCase(),
    },
  });
}

/**
 * Creates a drawing revision reference.
 */
export async function createDrawingRevision(
  drawingId: string,
  revisionNumber: string,
  fileUrl: string,
  fileSize: number,
  status = "DRAFT",
  tx?: any
) {
  const client = tx || db;

  return await client.drawingRevision.create({
    data: {
      drawingId,
      revisionNumber: revisionNumber.trim().toUpperCase(),
      status,
      fileUrl,
      fileSize,
    },
  });
}

/**
 * Releases a drawing revision as IFC (Issued for Construction).
 * Automatically marks previous revisions of this drawing as superseded.
 */
export async function releaseDrawingRevision(revisionId: string, tx?: any) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Fetch current revision
    const revision = await transactionClient.drawingRevision.findUnique({
      where: { id: revisionId },
      include: { drawing: true },
    });

    if (!revision) {
      throw new Error(`Drawing revision ${revisionId} not found.`);
    }

    // 2. Mark older revisions of the same drawing as superseded
    await transactionClient.drawingRevision.updateMany({
      where: {
        drawingId: revision.drawingId,
        id: { not: revisionId },
        isSuperseded: false,
      },
      data: {
        isSuperseded: true,
      },
    });

    // 3. Mark current revision as active IFC (approved)
    const updatedRevision = await transactionClient.drawingRevision.update({
      where: { id: revisionId },
      data: {
        status: "IFC",
        releasedAt: new Date(),
        isSuperseded: false,
      },
    });

    // 4. Enqueue outbox event "drawing.revision_released"
    await enqueueEvent(
      revision.drawing.workspaceId,
      "drawing.revision_released",
      {
        revisionId,
        drawingId: revision.drawingId,
        drawingNumber: revision.drawing.drawingNumber,
        revisionNumber: revision.revisionNumber,
      },
      transactionClient
    );

    return updatedRevision;
  });
}

/**
 * Logs a drawing transmittal for recipient distribution.
 */
export async function createDrawingTransmittal(
  workspaceId: string,
  projectId: string,
  transmittalNumber: string,
  recipientEmail: string,
  revisionIds: string[],
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Create transmittal
    const transmittal = await transactionClient.drawingTransmittal.create({
      data: {
        workspaceId,
        projectId,
        transmittalNumber: transmittalNumber.trim().toUpperCase(),
        recipientEmail: recipientEmail.trim().toLowerCase(),
        items: {
          create: revisionIds.map((revId) => ({
            revisionId: revId,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // 2. Enqueue event "transmittal.issued"
    await enqueueEvent(
      workspaceId,
      "transmittal.issued",
      { transmittalId: transmittal.id, recipientEmail, itemsCount: revisionIds.length },
      transactionClient
    );

    return transmittal;
  });
}
