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
    <div className="panel-surface flex min-w-0 flex-col gap-3 rounded-[1.6rem] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-soft">
        Booking List
      </p>

      {bookings.length === 0 ? (
        <p className="text-sm text-text-soft">
          No bookings yet. Select slots and a seat, then click &ldquo;Add Booking&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const isEditing = booking.id === editingBookingId;

            return (
              <div
                key={booking.id}
                className="rounded-[1.15rem] p-3 transition-all"
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
                  <span className="truncate text-sm font-medium text-foreground">
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
                <p className="mb-0.5 text-xs text-text-muted">{formatSlotSummary(booking.slots)}</p>

                {/* Duration */}
                <p className="mb-2 text-xs text-text-soft">{booking.slots.length}h total</p>

                {/* Actions — visible in creating mode (not while editing this item) */}
                {mode === "creating" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEditBooking(booking.id)}
                      className="text-xs font-medium text-accent hover:text-text-strong"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteBooking(booking.id)}
                      className="text-xs font-medium text-danger"
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
