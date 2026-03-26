/**
 * Shared booking utility functions used by the confirm modal and checkout flow.
 */

const SYDNEY_TIME_ZONE = "Australia/Sydney";

function parseOffsetMinutes(offsetText: string): number {
  if (offsetText === "GMT" || offsetText === "UTC") return 0;

  const match = offsetText.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    throw new Error(`Unsupported timezone offset: ${offsetText}`);
  }

  const [, sign, hours, minutes = "00"] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -totalMinutes : totalMinutes;
}

function getSydneyOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);

  const offsetText = parts.find((part) => part.type === "timeZoneName")?.value;
  if (!offsetText) {
    throw new Error("Unable to determine Australia/Sydney offset.");
  }

  return parseOffsetMinutes(offsetText);
}

/** Returns YYYY-MM-DD in the user's local calendar, not UTC. */
export function localDateISO(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Adds calendar days to a local YYYY-MM-DD string. */
export function addLocalDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return localDateISO(new Date(year, month - 1, day + days));
}

/**
 * Converts a Sydney wall-clock hour selection into an explicit UTC ISO string.
 * The backend stores and validates booking datetimes in UTC.
 */
export function toISO(date: string, hour: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, 0, 0, 0);

  let guess = wallClockUtc;
  for (let i = 0; i < 3; i++) {
    const offsetMinutes = getSydneyOffsetMinutes(new Date(guess));
    const corrected = wallClockUtc - offsetMinutes * 60_000;
    if (corrected === guess) break;
    guess = corrected;
  }

  return new Date(guess).toISOString();
}

/**
 * Splits a sorted slot array into contiguous time ranges.
 * Each range represents one real booking's start/end hours.
 *
 * e.g. [8, 9, 11] → [{start: 8, end: 10}, {start: 11, end: 12}]
 */
export function slotRanges(slots: number[]): { start: number; end: number }[] {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd + 1 });
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push({ start: rangeStart, end: rangeEnd + 1 });
  return ranges;
}
