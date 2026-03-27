"use client";

import { useEffect, useRef } from "react";
import { localDateISO } from "@/lib/booking";
import type { Booking, WorkspaceMode } from "@/store/bookingStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotPickerProps {
  selectedDate: string;
  maxDate?: string;
  activeSlots: number[];
  /**
   * The slot to visually highlight as a "start here" suggestion on first load.
   * Not pre-selected — the user must click to add it to activeSlots.
   * Null after any interaction clears it.
   */
  hintSlot: number | null;
  bookings: Booking[];
  editingBookingId: string | null;
  activeBookingColor: string;
  /** Whether the user can still add more slots (daily cap). */
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
   * Slots where the current user already has a confirmed booking in this space.
   * Shown with a distinct "My Booking" visual and disabled.
   */
  myBookingSlots: Set<number>;
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

const MY_BOOKING_COLOR = "#378ADD";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeOfDay(hour: number): "Morning" | "Afternoon" | "Evening" {
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlotPicker({
  selectedDate,
  maxDate,
  activeSlots,
  hintSlot,
  bookings,
  editingBookingId,
  activeBookingColor,
  canAddMoreSlots,
  mode,
  isValidBooking,
  hasBookings,
  seatBlockedSlots,
  myBookingSlots,
  removedSlotsFeedback,
  onDateChange,
  onToggleSlot,
  onAddBooking,
  onSaveChanges,
  onCancelEditing,
  onDeleteBooking,
  onCheckout,
}: SlotPickerProps) {
  const now = new Date();
  // Use local calendar date, not UTC, so "today" matches what the user sees.
  const todayISO = localDateISO(now);
  const currentHour = now.getHours();
  // Mirrors the store's `exactHour` check: when the user lands exactly on the
  // hour boundary the slot for that hour is still valid (it just started).
  // Any time after that (even one second) the start has already passed.
  const exactOnHour =
    now.getMinutes() === 0 &&
    now.getSeconds() === 0 &&
    now.getMilliseconds() === 0;

  // Precompute which hours start a new time-of-day group (for divider labels)
  const groupDividers = new Set<number>();
  let seenGroup: string | null = null;
  for (const hour of DAY_HOURS) {
    const g = getTimeOfDay(hour);
    if (g !== seenGroup) {
      groupDividers.add(hour);
      seenGroup = g;
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll: prefer the first active slot; fall back to the hint slot.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const target =
      container.querySelector<HTMLElement>("[data-active-slot='true']") ??
      container.querySelector<HTMLElement>("[data-hint-slot='true']");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [selectedDate]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 min-w-0">
      {/* Date picker */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date</p>
        <input
          type="date"
          value={selectedDate}
          min={todayISO}
          max={maxDate}
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
        <div
          ref={scrollContainerRef}
          className="space-y-0.5 overflow-y-auto max-h-72"
        >
          {DAY_HOURS.map((hour) => {
            const isActive = activeSlots.includes(hour);
            // At the exact hour boundary the slot is still startable; only
            // strictly earlier hours (or the current hour when time > :00:00)
            // are considered past.
            const isPast =
              selectedDate === todayISO &&
              (exactOnHour ? hour < currentHour : hour <= currentHour);
            const isMyBooking = myBookingSlots.has(hour);

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
              isPast ||
              isMyBooking ||
              isOtherBooking ||
              isSeatBlocked ||
              (!isActive && !canAddMoreSlots);

            // Hint: shown only when not active, not disabled, and hintSlot matches
            const isHint = hintSlot === hour && !isActive && !isDisabled;

            // Determine background color
            let bgColor: string | null = null;
            if (isActive) {
              bgColor = activeBookingColor;
            } else if (isMyBooking) {
              bgColor = MY_BOOKING_COLOR;
            } else if (isOtherBooking) {
              bgColor = storedBooking.color;
            }

            const bgStyle = bgColor
              ? { backgroundColor: `${bgColor}${isActive ? "2e" : "1a"}` }
              : {};

            const showDivider = groupDividers.has(hour);

            return (
              <div key={hour}>
                {showDivider && (
                  <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest px-1 pt-2 pb-0.5 first:pt-0">
                    {getTimeOfDay(hour)}
                  </p>
                )}
                <button
                  role="option"
                  aria-selected={isActive}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onToggleSlot(hour)}
                  data-active-slot={isActive ? "true" : undefined}
                  data-hint-slot={isHint ? "true" : undefined}
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
                    border: isActive
                      ? `1.5px solid ${bgColor}`
                      : isHint
                      ? "1.5px dashed #9CA3AF"
                      : isMyBooking
                      ? `1.5px solid ${MY_BOOKING_COLOR}66`
                      : "1.5px solid transparent",
                  }}
                >
                  <span
                    style={
                      isActive
                        ? { color: activeBookingColor }
                        : isMyBooking
                        ? { color: MY_BOOKING_COLOR }
                        : { color: "#6B7280" }
                    }
                  >
                    {pad(hour)}:00–{pad(hour + 1)}:00
                  </span>
                  {isActive && (
                    <span style={{ color: activeBookingColor }} aria-hidden>
                      ✓
                    </span>
                  )}
                  {isHint && (
                    <span className="text-[10px] text-gray-400" aria-label="Suggested start">
                      ↑ Start here
                    </span>
                  )}
                  {isMyBooking && !isActive && (
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: MY_BOOKING_COLOR }}
                    >
                      Mine
                    </span>
                  )}
                </button>
              </div>
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
