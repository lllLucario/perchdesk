"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBookingStore, type Booking, type BookingResult } from "@/store/bookingStore";
import { api } from "@/lib/api";
import { slotRanges, toISO } from "@/lib/booking";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

// ─── BookingSummaryRow ─────────────────────────────────────────────────────────

function BookingSummaryRow({ booking }: { booking: Booking }) {
  const ranges = slotRanges(booking.slots);
  const bookingCount = ranges.length;
  const rangeLabels = ranges
    .map((r) => `${fmtHour(r.start)}–${fmtHour(r.end)}`)
    .join(", ");

  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: booking.color }}
        />
        <span className="text-sm font-medium text-foreground">
          Seat {booking.seatLabel ?? "—"}
        </span>
        <span className="ml-auto text-xs text-text-soft">{booking.date}</span>
      </div>
      <p className="pl-[18px] text-sm text-text-muted">{rangeLabels}</p>
      <p className="mt-0.5 pl-[18px] text-xs text-text-soft">
        Will create {bookingCount} {bookingCount === 1 ? "booking" : "bookings"}
        {bookingCount > 1 && " (non-contiguous slots)"}
      </p>
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  bookings: Booking[];
  onClose: () => void;
}

export default function ConfirmModal({ bookings, onClose }: ConfirmModalProps) {
  const router = useRouter();
  const { setCheckoutResults } = useBookingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalBookings = bookings.reduce(
    (sum, b) => sum + slotRanges(b.slots).length,
    0
  );

  async function handleConfirm() {
    setIsSubmitting(true);
    const results: BookingResult[] = [];

    for (const booking of bookings) {
      if (!booking.seatId) continue;
      for (const range of slotRanges(booking.slots)) {
        const startISO = toISO(booking.date, range.start);
        const endISO = toISO(booking.date, range.end);
        try {
          const created = await api.post<{ id: string }>("/api/v1/bookings", {
            seat_id: booking.seatId,
            start_time: startISO,
            end_time: endISO,
          });
          results.push({
            planId: booking.id,
            planColor: booking.color,
            seatLabel: booking.seatLabel,
            start: startISO,
            end: endISO,
            bookingId: created.id,
            status: "success",
            errorMessage: null,
          });
        } catch (err: unknown) {
          results.push({
            planId: booking.id,
            planColor: booking.color,
            seatLabel: booking.seatLabel,
            start: startISO,
            end: endISO,
            bookingId: null,
            status: "error",
            errorMessage: err instanceof Error ? err.message : "Booking failed",
          });
        }
      }
    }

    setCheckoutResults(results);
    router.push("/result");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,26,22,0.48)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="mx-4 flex w-full max-w-md flex-col rounded-[1.75rem] border border-border bg-surface shadow-[0_24px_56px_rgba(22,26,22,0.16)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="confirm-modal-title"
            className="font-serif text-2xl leading-tight text-foreground"
          >
            Confirm {totalBookings === 1 ? "Booking" : "Bookings"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="text-xl leading-none text-text-soft hover:text-foreground disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* Booking list */}
        <div className="px-5 overflow-y-auto max-h-80">
          {bookings.map((booking) => (
            <BookingSummaryRow key={booking.id} booking={booking} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="button-secondary flex-1 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="button-primary flex-1 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
