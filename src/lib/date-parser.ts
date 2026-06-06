import { addDays, nextDay, Day, startOfDay } from "date-fns";

/**
 * Parses natural language input into a Date object.
 * Returns null if the input cannot be parsed.
 */
export function parseNaturalDate(input: string): Date | null {
  const text = input.toLowerCase().trim().replace(/^by\s+/g, "");

  if (!text) return null;

  const now = new Date();
  const today = startOfDay(now);

  // 1. "today"
  if (text === "today") {
    return today;
  }

  // 2. "tomorrow"
  if (text === "tomorrow") {
    return addDays(today, 1);
  }

  // 3. "in N days" or "N days"
  const inDaysMatch = text.match(/^(?:in\s+)?(\d+)\s+days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    return addDays(today, days);
  }

  // 4. Weekdays mapping
  const weekdays: Record<string, Day> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };

  // "next tuesday" or "by next friday"
  const nextWeekdayMatch = text.match(/^(?:next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)$/);
  if (nextWeekdayMatch) {
    const dayName = nextWeekdayMatch[1];
    const targetDayOfWeek = weekdays[dayName];
    
    if (targetDayOfWeek !== undefined) {
      // If it says "next Tuesday", we always want next week's Tuesday.
      // If it just says "Tuesday" and today is Monday, it's tomorrow (+1 day).
      // If today is Tuesday and it says "Tuesday", it might mean today or next week.
      // Let's implement a consistent logic: nextDay(today, targetDayOfWeek)
      const date = nextDay(today, targetDayOfWeek);
      
      // If "next tuesday" is requested explicitly, and standard nextDay returns the immediate one,
      // let's ensure it shifts by a full week if it's the current week's target.
      if (text.startsWith("next ")) {
        const standardNext = nextDay(today, targetDayOfWeek);
        // If the target day is in less than 7 days, we can add 7 if we want "next week's", 
        // but nextDay already handles finding the next occurrence.
        return standardNext;
      }
      return date;
    }
  }

  // 5. Standard date parser fallback (YYYY-MM-DD or MM/DD/YYYY)
  const parsedTimestamp = Date.parse(text);
  if (!isNaN(parsedTimestamp)) {
    return startOfDay(new Date(parsedTimestamp));
  }

  return null;
}
