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
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: booking.color }}
        />
        <span className="text-sm font-medium text-gray-900">
          Seat {booking.seatLabel ?? "—"}
        </span>
        <span className="text-xs text-gray-400 ml-auto">{booking.date}</span>
      </div>
      <p className="text-sm text-gray-600 pl-[18px]">{rangeLabels}</p>
      <p className="text-xs text-gray-400 mt-0.5 pl-[18px]">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2
            id="confirm-modal-title"
            className="text-base font-semibold text-gray-900"
          >
            Confirm {totalBookings === 1 ? "Booking" : "Bookings"}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 disabled:opacity-40 text-xl leading-none"
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
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
