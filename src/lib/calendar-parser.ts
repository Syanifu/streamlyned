import { addDays, nextDay, Day, startOfDay, addHours } from "date-fns";

export interface ParsedEvent {
  startAt: Date;
  endAt: Date;
  recurrence: string | null; // null | "DAILY" | "WEEKLY" | "MONTHLY"
}

/**
 * Parses a natural language sentence into start time, end time, and recurrence.
 * Example inputs:
 * - "team sync every Tuesday at 10" -> next Tuesday at 10:00 AM, ends at 11:00 AM, weekly recurrence
 * - "project review tomorrow at 3pm" -> tomorrow at 3:00 PM, ends at 4:00 PM, no recurrence
 */
export function parseNaturalEvent(input: string): ParsedEvent {
  const text = input.toLowerCase().trim();
  const now = new Date();
  let startAt = new Date(now.getTime() + 1 * 60 * 60 * 1000); // Default: 1 hour from now
  let endAt = new Date(startAt.getTime() + 1 * 60 * 60 * 1000); // Default: 1 hour duration
  let recurrence: string | null = null;

  // 1. Check recurrence
  if (text.includes("every") || text.includes("weekly") || text.includes("daily")) {
    if (text.includes("day") && !text.includes("monday") && !text.includes("tuesday") && !text.includes("wednesday") && !text.includes("thursday") && !text.includes("friday") && !text.includes("saturday") && !text.includes("sunday")) {
      recurrence = "DAILY";
    } else {
      recurrence = "WEEKLY";
    }
  }

  // 2. Parse weekdays
  const weekdays: Record<string, Day> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
  };

  let targetDay: Day | null = null;
  for (const [dayName, dayVal] of Object.entries(weekdays)) {
    if (text.includes(dayName)) {
      targetDay = dayVal;
      break;
    }
  }

  // Determine starting date
  let eventDate = startOfDay(now);
  if (text.includes("tomorrow")) {
    eventDate = addDays(eventDate, 1);
  } else if (targetDay !== null) {
    eventDate = nextDay(eventDate, targetDay);
  }

  // 3. Parse times (e.g. "at 10", "at 10am", "at 3pm", "at 15:30")
  let hours = 10;
  let minutes = 0;

  const timeMatch = text.match(/at\s+(\d+)(?::(\d+))?\s*(am|pm)?/);
  if (timeMatch) {
    let parsedHour = parseInt(timeMatch[1], 10);
    const parsedMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3];

    if (ampm === "pm" && parsedHour < 12) {
      parsedHour += 12;
    } else if (ampm === "am" && parsedHour === 12) {
      parsedHour = 0;
    } else if (!ampm && parsedHour < 8) {
      // Guess PM for single digit small hours (like "at 3" -> 3:00 PM)
      parsedHour += 12;
    }

    hours = parsedHour;
    minutes = parsedMin;
  }

  // Combine eventDate and parsed hours/minutes
  startAt = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), hours, minutes);
  endAt = addHours(startAt, 1); // Default to 1 hour event

  return { startAt, endAt, recurrence };
}
