"use client";

import type { Booking, WorkspaceMode } from "@/store/bookingStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collapse a sorted array of hours into contiguous range strings. */
function formatSlotSummary(slots: number[]): string {
  if (slots.length === 0) return "No slots selected";
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push([start, end]);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push([start, end]);

  return ranges
    .map(([s, e]) => `${String(s).padStart(2, "0")}:00–${String(e + 1).padStart(2, "0")}:00`)
    .join(", ");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingListPanelProps {
  bookings: Booking[];
  editingBookingId: string | null;
  mode: WorkspaceMode;
  onEditBooking: (bookingId: string) => void;
  onDeleteBooking: (bookingId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingListPanel({
  bookings,
  editingBookingId,
  mode,
  onEditBooking,
  onDeleteBooking,
}: BookingListPanelProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Booking List
      </p>

      {bookings.length === 0 ? (
        <p className="text-sm text-gray-400">
          No bookings yet. Select slots and a seat, then click &ldquo;Add Booking&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const isEditing = booking.id === editingBookingId;

            return (
              <div
                key={booking.id}
                className="rounded-xl p-3 transition-all"
                style={{
                  border: isEditing
                    ? `2px solid ${booking.color}`
                    : `1.5px solid ${booking.color}33`,
                  backgroundColor: isEditing ? `${booking.color}14` : `${booking.color}08`,
                }}
              >
                {/* Color dot + seat label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: booking.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {booking.seatLabel ? `Seat ${booking.seatLabel}` : "No seat yet"}
                  </span>
                  {isEditing && (
                    <span
                      className="ml-auto text-xs font-semibold flex-shrink-0"
                      style={{ color: booking.color }}
                    >
                      Editing
                    </span>
                  )}
                </div>

                {/* Slot summary */}
                <p className="text-xs text-gray-500 mb-0.5">{formatSlotSummary(booking.slots)}</p>

                {/* Duration */}
                <p className="text-xs text-gray-400 mb-2">{booking.slots.length}h total</p>

                {/* Actions — visible in creating mode (not while editing this item) */}
                {mode === "creating" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEditBooking(booking.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteBooking(booking.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
