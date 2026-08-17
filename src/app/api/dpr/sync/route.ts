import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { postJournalEntry } from "@/lib/finance/ledger";
import { enqueueEvent } from "@/lib/events/outbox";
import { checkBudgetThreshold } from "@/lib/project/budget";
import { assertPeriodOpen } from "@/lib/finance/period";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    const { projectId, reportDate, qtyLines, labourLines, equipmentLines } = body;

    if (!projectId || !reportDate) {
      return NextResponse.json({ error: "Missing required fields: projectId, reportDate" }, { status: 400 });
    }

    const parsedDate = new Date(reportDate);

    // Calculate total provisional costs
    let labourCost = 0;
    if (labourLines && Array.isArray(labourLines)) {
      for (const lab of labourLines) {
        labourCost += lab.headcount * lab.hours * lab.ratePerHour;
      }
    }

    let equipmentCost = 0;
    if (equipmentLines && Array.isArray(equipmentLines)) {
      for (const eq of equipmentLines) {
        equipmentCost += eq.runningHours * eq.ratePerHour;
      }
    }

    const totalProvisionalCost = labourCost + equipmentCost;

    const result = await db.$transaction(async (tx) => {
      // Assert that the posting period is open for this DPR report date
      await assertPeriodOpen(session.workspace.id, parsedDate, tx);

      // 1. Verify WBS nodes in quantity lines exist and check budget
      if (qtyLines && Array.isArray(qtyLines) && qtyLines.length > 0) {
        for (const line of qtyLines) {
          // If we apportion costs, we check budget, otherwise just verify existence
          const node = await tx.wbsNode.findUnique({
            where: { id: line.wbsNodeId },
          });

          if (!node || node.projectId !== projectId) {
            throw new Error(`WBS Node ${line.wbsNodeId} does not belong to Project ${projectId}.`);
          }
        }
      }

      // Check if project budget can absorb the provisional costs
      // (For this prototype, we'll apportion cost to the first WBS node if present, or check overall)
      if (qtyLines && Array.isArray(qtyLines) && qtyLines.length > 0 && totalProvisionalCost > 0) {
        const firstWbsNodeId = qtyLines[0].wbsNodeId;
        const check = await checkBudgetThreshold(firstWbsNodeId, totalProvisionalCost, tx);
        if (!check.allowed) {
          throw new Error(
            `Site operational costs exceed WBS budget for [${check.code} - ${check.name}]. Remaining: ${check.remaining}, Additional: ${totalProvisionalCost}`
          );
        }

        // Increment actualCost on that WBS Node
        await tx.wbsNode.update({
          where: { id: firstWbsNodeId },
          data: {
            actualCost: { increment: totalProvisionalCost },
          },
        });
      }

      // 2. Create the DPR record
      const dpr = await tx.dailyProgressReport.create({
        data: {
          workspaceId: session.workspace.id,
          projectId,
          reportDate: parsedDate,
          status: "SUBMITTED",
          reportedByUserId: session.user.id,
          qtyLines: {
            create: (qtyLines || []).map((q: any) => ({
              wbsNodeId: q.wbsNodeId,
              quantity: q.quantity,
            })),
          },
          labourLines: {
            create: (labourLines || []).map((l: any) => ({
              trade: l.trade.toUpperCase(),
              headcount: l.headcount,
              hours: l.hours,
              ratePerHour: l.ratePerHour,
            })),
          },
          equipmentLines: {
            create: (equipmentLines || []).map((e: any) => ({
              equipmentCode: e.equipmentCode.toUpperCase(),
              runningHours: e.runningHours,
              idleHours: e.idleHours,
              ratePerHour: e.ratePerHour,
            })),
          },
        },
        include: {
          qtyLines: true,
          labourLines: true,
          equipmentLines: true,
        },
      });

      // 3. Post General Ledger entry
      // - Debit: WIP Construction Costs (1300)
      // - Credit: Direct Construction Labor/Accrued Wages (5100 / 2000)
      if (totalProvisionalCost > 0) {
        await postJournalEntry(
          session.workspace.id,
          {
            ledgerDate: parsedDate,
            referenceType: "DPR",
            referenceId: dpr.id,
            description: `Site provisional labour/plant costs on ${parsedDate.toDateString()}`,
            lines: [
              { coaCode: "1300", debit: totalProvisionalCost, credit: 0, projectId },
              { coaCode: "5100", debit: 0, credit: totalProvisionalCost, projectId },
            ],
          },
          tx
        );
      }

      // 4. Enqueue event in outbox "dpr.submitted"
      await enqueueEvent(
        session.workspace.id,
        "dpr.submitted",
        { dprId: dpr.id, totalProvisionalCost, reportDate: parsedDate },
        tx
      );

      return dpr;
    });

    return NextResponse.json({ success: true, dpr: result });
  } catch (error: any) {
    console.error("DPR Sync Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
