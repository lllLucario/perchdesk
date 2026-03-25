/**
 * Shared booking utility functions used by the confirm modal and checkout flow.
 */

/** ISO datetime string from a YYYY-MM-DD date and an hour integer. */
export function toISO(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00`;
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
