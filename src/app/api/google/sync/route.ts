import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenRecord = await db.googleCalendarToken.findUnique({
    where: { userId: session.user.id },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken ?? undefined,
    expiry_date: tokenRecord.expiresAt?.getTime() ?? undefined,
  });

  // Auto-refresh and persist new tokens if needed
  oauth2Client.on("tokens", async (tokens) => {
    await db.googleCalendarToken.update({
      where: { userId: session.user.id },
      data: {
        accessToken: tokens.access_token ?? tokenRecord.accessToken,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Fetch events in the next 60 days from all calendars
  const now = new Date();
  const future = new Date(now);
  future.setDate(future.getDate() + 60);

  const listRes = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
  });

  const googleEvents = listRes.data.items ?? [];

  // Find a default project to attach Google events to
  const defaultProject = await db.project.findFirst({
    where: {
      workspaceId: session.workspace.id,
      deletedAt: null,
      members: { some: { userId: session.user.id } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!defaultProject) {
    return NextResponse.json({ error: "No project found to attach events to" }, { status: 400 });
  }

  let upserted = 0;

  for (const event of googleEvents) {
    if (!event.id || !event.summary) continue;

    const startAt = event.start?.dateTime
      ? new Date(event.start.dateTime)
      : event.start?.date
        ? new Date(event.start.date + "T00:00:00Z")
        : null;

    const endAt = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : event.end?.date
        ? new Date(event.end.date + "T23:59:59Z")
        : null;

    if (!startAt || !endAt) continue;

    // Use Google event ID stored in description field as dedup key
    const existing = await db.calendarEvent.findFirst({
      where: {
        workspaceId: session.workspace.id,
        source: "google",
        description: { contains: `__gcal_id:${event.id}` },
      },
    });

    const description = `${event.description ?? ""}${event.description ? "\n" : ""}__gcal_id:${event.id}`;

    if (existing) {
      await db.calendarEvent.update({
        where: { id: existing.id },
        data: {
          title: event.summary,
          description,
          startAt,
          endAt,
          location: event.location ?? null,
          videoCallLink: event.hangoutLink ?? null,
        },
      });
    } else {
      await db.calendarEvent.create({
        data: {
          title: event.summary,
          description,
          startAt,
          endAt,
          location: event.location ?? null,
          videoCallLink: event.hangoutLink ?? null,
          source: "google",
          workspaceId: session.workspace.id,
          projectId: defaultProject.id,
          priority: "P4",
        },
      });
    }

    upserted++;
  }

  await db.googleCalendarToken.update({
    where: { userId: session.user.id },
    data: { syncedAt: new Date() },
  });

  return NextResponse.json({ synced: upserted });
}
