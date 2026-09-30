/**
 * Date and time formatting for shifts. Every time is shown in the food bank's
 * own time zone, on the server and in the browser alike, so a server-rendered
 * page and the page the browser patches always agree.
 */
export const TIME_ZONE = "America/Chicago";

export type ShiftKind = "sorting" | "packing" | "delivery";

export const KIND_LABELS: Record<ShiftKind, string> = {
  sorting: "Sorting",
  packing: "Packing",
  delivery: "Delivery driver",
};

export const KINDS: ShiftKind[] = ["sorting", "packing", "delivery"];

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "short",
  day: "numeric",
});

const shortDayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});

/** The calendar day a moment falls on in the food bank's zone, as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  return dayKeyFormat.format(d);
}

export function formatDay(d: Date): string {
  return dayFormat.format(d);
}

export function formatShortDay(d: Date): string {
  return shortDayFormat.format(d);
}

export function formatTime(d: Date): string {
  return timeFormat.format(d).replace(":00", "").replace(" ", " ");
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "Today", "Tomorrow", or the weekday and date. */
export function relativeDay(d: Date, now: Date = new Date()): string {
  let key = dayKey(d);

  if (key === dayKey(now)) {
    return "Today";
  }

  if (key === dayKey(new Date(now.getTime() + 86_400_000))) {
    return "Tomorrow";
  }

  return formatDay(d);
}

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / 3_600_000;
}

export function formatHours(hours: number): string {
  let rounded = Math.round(hours * 10) / 10;

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * The UTC moment for a wall-clock date and time in the food bank's zone:
 * "2026-10-05" at "09:00" is 14:00Z while Chicago is on daylight time.
 */
export function zonedMoment(date: string, time: string): Date {
  let guess = new Date(`${date}T${time}:00Z`);
  let parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);

  let get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  let asZoned = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  let offset = asZoned - guess.getTime();

  return new Date(guess.getTime() - offset);
}
