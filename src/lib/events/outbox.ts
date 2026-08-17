import { db } from "../db";

export type EventHandler = (workspaceId: string, payload: any) => Promise<void>;

const registry: Record<string, EventHandler> = {};

/**
 * Registers an event handler for a specific event type.
 */
export function registerHandler(eventType: string, handler: EventHandler) {
  registry[eventType] = handler;
}

/**
 * Enqueues an event into the outbox. Should ideally be run inside a Prisma client transaction.
 * @param workspaceId ID of the workspace
 * @param eventType type of event, e.g. "E03" or "purchase_order.submitted"
 * @param payload JSON-serializable payload
 * @param tx Prisma client instance (optional, for transactions)
 */
export async function enqueueEvent(
  workspaceId: string,
  eventType: string,
  payload: any,
  tx?: any
) {
  const client = tx || db;
  return await client.outboxEvent.create({
    data: {
      workspaceId,
      eventType,
      payload: JSON.stringify(payload),
      status: "PENDING",
    },
  });
}

/**
 * Processes a batch of pending outbox events.
 * @param batchSize Number of events to process in this run (default 10)
 */
export async function processOutbox(batchSize = 10) {
  // Find pending events or events that failed but have < 3 attempts
  const events = await db.outboxEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  console.log(`  [processOutbox] Queried events from DB in outbox.ts:`, events.map(e => ({ id: e.id, type: e.eventType, status: e.status })));
  console.log(`  [processOutbox] Registered handler keys:`, Object.keys(registry));

  if (events.length === 0) {
    return { processed: 0 };
  }

  let processedCount = 0;

  for (const event of events) {
    console.log(`    [processOutbox] Loop processing event ${event.id} of type ${event.eventType}`);
    // 1. Mark event as PROCESSING and increment attempts
    await db.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
      },
    });

    const handler = registry[event.eventType];
    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(event.payload);
    } catch (jsonErr) {
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          error: `Malformed JSON payload: ${event.payload}`,
          processedAt: new Date(),
        },
      });
      continue;
    }

    if (!handler) {
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          error: `No handler registered for event type: ${event.eventType}`,
          processedAt: new Date(),
        },
      });
      continue;
    }

    try {
      // 2. Execute registered handler
      await handler(event.workspaceId, parsedPayload);

      // 3. Mark as COMPLETED
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          error: null,
        },
      });
      processedCount++;
    } catch (err: any) {
      console.error(`Error processing event ${event.id} (${event.eventType}):`, err);
      
      await db.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          error: err?.message || String(err),
          processedAt: new Date(),
        },
      });
    }
  }

  return { processed: processedCount };
}
