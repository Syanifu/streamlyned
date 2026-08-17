import { db } from "../db";
import { enqueueEvent } from "../events/outbox";

/**
 * Registers a functional plant commissioning system.
 */
export async function createCommissioningSystem(
  workspaceId: string,
  projectId: string,
  systemCode: string,
  name: string,
  tx?: any
) {
  const client = tx || db;

  return await client.commissioningSystem.create({
    data: {
      workspaceId,
      projectId,
      systemCode: systemCode.trim().toUpperCase(),
      name: name.trim(),
      status: "PENDING",
    },
  });
}

/**
 * Registers a commissioning check-list loop under a functional system.
 */
export async function createCommissioningLoop(
  systemId: string,
  wbsNodeId: string,
  loopTag: string,
  checklistResults: string,
  tx?: any
) {
  const client = tx || db;

  return await client.commissioningLoop.create({
    data: {
      systemId,
      wbsNodeId,
      loopTag: loopTag.trim().toUpperCase(),
      status: "PENDING",
      checklistResults,
    },
  });
}

/**
 * Logs functional test results for a loop.
 * If all loops under the parent system pass, marks the system as COMMISSIONED and enqueues outbox triggers.
 */
export async function completeCommissioningLoop(
  loopId: string,
  status: "PASSED" | "FAILED",
  inspectedBy: string,
  tx?: any
) {
  const client = tx || db;

  return await client.$transaction(async (transactionClient: any) => {
    // 1. Update current loop test results
    const loop = await transactionClient.commissioningLoop.update({
      where: { id: loopId },
      data: {
        status,
        inspectedBy,
        inspectedAt: new Date(),
      },
      include: {
        system: true,
      },
    });

    // 2. Evaluate other loops under the system
    const systemLoops = await transactionClient.commissioningLoop.findMany({
      where: { systemId: loop.systemId },
      select: { id: true, status: true },
    });

    const allPassed = systemLoops.every((l: { status: string }) => l.status === "PASSED");

    if (allPassed) {
      // 3. Mark parent system as COMMISSIONED
      const updatedSystem = await transactionClient.commissioningSystem.update({
        where: { id: loop.systemId },
        data: { status: "COMMISSIONED" },
      });

      // 4. Enqueue event "commissioning.system_commissioned"
      await enqueueEvent(
        loop.system.workspaceId,
        "commissioning.system_commissioned",
        {
          systemId: loop.systemId,
          systemCode: loop.system.systemCode,
          name: loop.system.name,
          projectId: loop.system.projectId,
          commissionedAt: new Date(),
        },
        transactionClient
      );

      console.log(`    [Handover] Functional System "${loop.system.systemCode}" has been fully COMMISSIONED.`);
    }

    return loop;
  });
}
