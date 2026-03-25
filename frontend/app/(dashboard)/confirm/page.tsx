"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBookingStore, type Draft, type BookingResult } from "@/store/bookingStore";
import { api } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO datetime string from a YYYY-MM-DD date and an hour integer. */
function toISO(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00`;
}

/** Format an hour integer as HH:00 label. */
function fmtHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/**
 * Splits a sorted slot array into contiguous ranges.
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

/** Total booking count across all drafts. */
function totalBookingCount(drafts: Draft[]): number {
  return drafts.reduce((sum, d) => sum + slotRanges(d.slots).length, 0);
}

// ─── DraftPreviewRow ──────────────────────────────────────────────────────────

function DraftPreviewRow({ draft }: { draft: Draft }) {
  const ranges = slotRanges(draft.slots);
  const hasGaps = ranges.length > 1;

  return (
    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: draft.color }}
        />
        <span className="text-sm font-medium text-gray-900">
          Seat {draft.seatLabel ?? "—"}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{draft.date}</span>
      </div>

      {/* Booking breakdown */}
      <div className="flex flex-col gap-1 pl-5">
        {ranges.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <span>
              {fmtHour(r.start)}–{fmtHour(r.end)}
            </span>
            <span className="text-xs text-gray-400">
              ({r.end - r.start}h)
            </span>
          </div>
        ))}
      </div>

      {/* Gap warning */}
      {hasGaps && (
        <p className="pl-5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
          This draft has gaps and will create {ranges.length} separate bookings.
        </p>
      )}
    </div>
  );
}

// ─── ConfirmPage ──────────────────────────────────────────────────────────────

export default function ConfirmPage() {
  const router = useRouter();
  const { drafts, setCheckoutResults } = useBookingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const bookingCount = totalBookingCount(drafts);

  async function handleConfirm() {
    setIsSubmitting(true);
    setSubmitError(null);

    const results: BookingResult[] = [];

    for (const draft of drafts) {
      if (!draft.seatId) continue;
      const ranges = slotRanges(draft.slots);

      for (const range of ranges) {
        const startISO = toISO(draft.date, range.start);
        const endISO = toISO(draft.date, range.end);

        try {
          const booking = await api.post<{ id: string }>("/api/v1/bookings", {
            seat_id: draft.seatId,
            start_time: startISO,
            end_time: endISO,
          });
          results.push({
            draftId: draft.id,
            draftColor: draft.color,
            seatLabel: draft.seatLabel,
            start: startISO,
            end: endISO,
            bookingId: booking.id,
            status: "success",
            errorMessage: null,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Booking failed";
          results.push({
            draftId: draft.id,
            draftColor: draft.color,
            seatLabel: draft.seatLabel,
            start: startISO,
            end: endISO,
            bookingId: null,
            status: "error",
            errorMessage: message,
          });
        }
      }
    }

    // Store results and clear drafts, then navigate to result page
    setCheckoutResults(results);
    router.push("/result");
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <nav className="text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Confirm Booking</span>
        </nav>
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">No drafts to confirm</p>
          <p className="text-sm mb-6">Go back to the floorplan and add some booking drafts first.</p>
          <Link
            href="/buildings"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Spaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Confirm Booking</span>
      </nav>

      {/* Heading */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Confirm your bookings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review{" "}
          {bookingCount === 1 ? "1 booking" : `${bookingCount} bookings`} across{" "}
          {drafts.length === 1 ? "1 draft" : `${drafts.length} drafts`} before submitting.
        </p>
      </div>

      {/* Draft list */}
      <div className="flex flex-col gap-3">
        {drafts.map((draft) => (
          <DraftPreviewRow key={draft.id} draft={draft} />
        ))}
      </div>

      {/* Submit error */}
      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {submitError}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Submitting…" : `Confirm ${bookingCount === 1 ? "Booking" : "Bookings"}`}
        </button>
        <button
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Back to Workspace
        </button>
      </div>
    </div>
  );
}
