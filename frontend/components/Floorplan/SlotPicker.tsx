"use client";

import type { Booking, WorkspaceMode } from "@/store/bookingStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotPickerProps {
  selectedDate: string;
  activeSlots: number[];
  bookings: Booking[];
  editingBookingId: string | null;
  activeBookingColor: string;
  /** Whether the user can still add more slots (daily 8h cap). */
  canAddMoreSlots: boolean;
  mode: WorkspaceMode;
  /** True when the current booking has at least one slot and a seat. */
  isValidBooking: boolean;
  hasBookings: boolean;
  /**
   * Slots blocked by the currently selected seat's availability.
   * These slots are greyed out and cannot be selected.
   */
  seatBlockedSlots: Set<number>;
  /**
   * Feedback message shown when slots were auto-removed due to seat selection.
   * Null when there is no pending message.
   */
  removedSlotsFeedback: string | null;
  onDateChange: (date: string) => void;
  onToggleSlot: (hour: number) => void;
  onAddBooking: () => void;
  onSaveChanges: () => void;
  onCancelEditing: () => void;
  onDeleteBooking: () => void;
  onCheckout: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hourly slots 08:00–22:00 (14 blocks). */
const DAY_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlotPicker({
  selectedDate,
  activeSlots,
  bookings,
  editingBookingId,
  activeBookingColor,
  canAddMoreSlots,
  mode,
  isValidBooking,
  hasBookings,
  seatBlockedSlots,
  removedSlotsFeedback,
  onDateChange,
  onToggleSlot,
  onAddBooking,
  onSaveChanges,
  onCancelEditing,
  onDeleteBooking,
  onCheckout,
}: SlotPickerProps) {
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 min-w-0">
      {/* Date picker */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date</p>
        <input
          type="date"
          value={selectedDate}
          min={todayISO}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Removed slots feedback */}
      {removedSlotsFeedback && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {removedSlotsFeedback}
        </p>
      )}

      {/* Slot blocks */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Time Slots
        </p>
        <div className="space-y-0.5 overflow-y-auto max-h-72">
          {DAY_HOURS.map((hour) => {
            const isActive = activeSlots.includes(hour);

            // Slot belongs to a stored booking (not the one being edited)
            const storedBooking = bookings.find(
              (b) =>
                b.date === selectedDate &&
                b.slots.includes(hour) &&
                b.id !== editingBookingId
            );

            const isOtherBooking = !!storedBooking;
            const isSeatBlocked = seatBlockedSlots.has(hour);
            const isDisabled =
              isOtherBooking ||
              isSeatBlocked ||
              (!isActive && !canAddMoreSlots);

            const bgColor = isActive
              ? activeBookingColor
              : isOtherBooking
              ? storedBooking.color
              : null;

            const bgStyle = bgColor
              ? { backgroundColor: `${bgColor}${isActive ? "2e" : "1a"}` }
              : {};

            return (
              <button
                key={hour}
                role="option"
                aria-selected={isActive}
                disabled={isDisabled}
                onClick={() => !isDisabled && onToggleSlot(hour)}
                className={[
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                  isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-gray-50 cursor-pointer",
                  isActive ? "font-medium" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  ...bgStyle,
                  border: isActive ? `1.5px solid ${bgColor}` : "1.5px solid transparent",
                }}
              >
                <span style={isActive ? { color: activeBookingColor } : { color: "#6B7280" }}>
                  {pad(hour)}:00–{pad(hour + 1)}:00
                </span>
                {isActive && (
                  <span style={{ color: activeBookingColor }} aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking action buttons */}
      <div className="space-y-2">
        {mode === "creating" && (
          <>
            <button
              onClick={onAddBooking}
              disabled={!isValidBooking}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Booking
            </button>
            {hasBookings && (
              <button
                onClick={onCheckout}
                className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Submit
              </button>
            )}
          </>
        )}

        {mode === "editing" && (
          <>
            <button
              onClick={onSaveChanges}
              disabled={!isValidBooking}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={onCancelEditing}
              className="w-full border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel Editing
            </button>
            <button
              onClick={onDeleteBooking}
              className="w-full border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
