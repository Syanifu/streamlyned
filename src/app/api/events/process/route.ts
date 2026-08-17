import { NextResponse } from "next/server";
import { processOutbox } from "@/lib/events/outbox";

export async function POST(request: Request) {
  try {
    // Basic verification could be added here if needed (e.g. cron auth secret)
    const { processed } = await processOutbox();
    return NextResponse.json({ success: true, processed });
  } catch (error: any) {
    console.error("Failed to process outbox:", error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
