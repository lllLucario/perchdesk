"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  useSpace,
  useSpaceRules,
  type Seat,
  type SeatAvailability,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import { addLocalDays, localDateISO, toISO } from "@/lib/booking";
import { useBookingStore } from "@/store/bookingStore";
import SeatMapCanvas from "@/components/SeatMap/SeatMapCanvas";
import SlotPicker from "@/components/Floorplan/SlotPicker";
import BookingListPanel from "@/components/Floorplan/BookingListPanel";
import ConfirmModal from "@/components/Floorplan/ConfirmModal";

function slotRanges(date: string, slots: number[]) {
  if (slots.length === 0) return [];

  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: { start: string; end: string }[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push({ start: toISO(date, start), end: toISO(date, end + 1) });
      start = sorted[i];
      end = sorted[i];
    }
  }

  ranges.push({ start: toISO(date, start), end: toISO(date, end + 1) });
  return ranges;
}

/** All 14 hourly slots (08:00–22:00). */
const ALL_DAY_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

export default function SpaceFloorplanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [removedSlotsFeedback, setRemovedSlotsFeedback] = useState<string | null>(null);

  const { data: space, isLoading } = useSpace(id);
  const { data: rules } = useSpaceRules(id);

  const {
    mode,
    selectedDate,
    activeSlots,
    hintSlot,
    activeSeatId,
    activeSeatLabel,
    activeBookingColor,
    bookings,
    editingBookingId,
    setDate,
    enterEditing,
    cancelEditing,
    toggleSlot,
    setActiveSeat,
    clearActiveSeat,
    addBooking,
    saveChanges,
    deleteBooking,
    removeSlotsFromActive,
  } = useBookingStore();

  // ── Availability query for selected slots ─────────────────────────────────

  const availabilityRanges = useMemo(
    () => slotRanges(selectedDate, activeSlots),
    [selectedDate, activeSlots]
  );

  const availabilityQueries = useQueries({
    queries: availabilityRanges.map(({ start, end }) => ({
      queryKey: ["spaces", id, "availability", start, end],
      queryFn: () =>
        api.get<SeatAvailability[]>(
          `/api/v1/spaces/${id}/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        ),
      enabled: !!id,
    })),
  });

  const availability = availabilityQueries
    .map((q) => q.data)
    .filter((result): result is SeatAvailability[] => !!result);

  const availabilityMap = useMemo(():
    | Record<string, "available" | "booked" | "my_booking">
    | undefined => {
    if (availability.length === 0) return undefined;

    const merged: Record<string, "available" | "booked" | "my_booking"> = {};

    for (const result of availability) {
      for (const seat of result) {
        const current = merged[seat.id];
        if (seat.booking_status === "booked" || current === "booked") {
          merged[seat.id] = "booked";
        } else if (seat.booking_status === "my_booking" || current === "my_booking") {
          merged[seat.id] = "my_booking";
        } else {
          merged[seat.id] = "available";
        }
      }
    }

    return merged;
  }, [availability]);

  // ── Per-hour availability for the whole space (always-on, 14 queries) ───────
  // Used to derive both seat-blocked slots and my-booking slots.

  const hourQueries = useQueries({
    queries: ALL_DAY_HOURS.map((hour) => ({
      queryKey: ["spaces", id, "hour-availability", selectedDate, hour],
      queryFn: () =>
        api.get<SeatAvailability[]>(
          `/api/v1/spaces/${id}/availability?start=${encodeURIComponent(toISO(selectedDate, hour))}&end=${encodeURIComponent(toISO(selectedDate, hour + 1))}`
        ),
      enabled: !!id,
    })),
  });

  /** Hours blocked for the currently selected seat (booked by others). */
  const seatBlockedSlots = useMemo((): Set<number> => {
    if (!activeSeatId) return new Set();
    const blocked = new Set<number>();
    ALL_DAY_HOURS.forEach((hour, index) => {
      const data = hourQueries[index]?.data;
      if (!data) return;
      const seatRow = data.find((s) => s.id === activeSeatId);
      if (seatRow?.booking_status === "booked") {
        blocked.add(hour);
      }
    });
    return blocked;
  }, [activeSeatId, hourQueries]);

  /** Hours where the current user already has a confirmed booking in this space. */
  const myBookingSlots = useMemo((): Set<number> => {
    const set = new Set<number>();
    ALL_DAY_HOURS.forEach((hour, index) => {
      const data = hourQueries[index]?.data;
      if (!data) return;
      if (data.some((s) => s.booking_status === "my_booking")) {
        set.add(hour);
      }
    });
    return set;
  }, [hourQueries]);

  /**
   * Seat IDs where the current user has any existing booking on the selected date.
   * Derived from the always-running hourly queries so the seat map can block
   * these seats even before the user selects time slots.
   */
  const myBookingSeatIds = useMemo((): Set<string> => {
    const set = new Set<string>();
    for (const query of hourQueries) {
      if (!query.data) continue;
      for (const s of query.data) {
        if (s.booking_status === "my_booking") set.add(s.id);
      }
    }
    return set;
  }, [hourQueries]);

  // ── Auto-remove active slots that the seat blocks ─────────────────────────

  const prevSeatIdRef = useRef<string | null>(null);
  const prevBlockedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!activeSeatId) {
      prevSeatIdRef.current = null;
      prevBlockedRef.current = new Set();
      return;
    }

    const seatChanged = prevSeatIdRef.current !== activeSeatId;
    const blockedChanged =
      seatBlockedSlots.size !== prevBlockedRef.current.size ||
      [...seatBlockedSlots].some((h) => !prevBlockedRef.current.has(h));

    if (!seatChanged && !blockedChanged) return;

    prevSeatIdRef.current = activeSeatId;
    prevBlockedRef.current = seatBlockedSlots;

    const toRemove = activeSlots.filter((h) => seatBlockedSlots.has(h));
    if (toRemove.length === 0) return;

    removeSlotsFromActive(toRemove);

    // Defer the React setState call to avoid triggering cascading renders
    // from within the effect body (react-hooks/set-state-in-effect).
    const removed = toRemove
      .map((h) => `${String(h).padStart(2, "0")}:00`)
      .join(", ");
    const msg = `${toRemove.length === 1 ? "Slot" : "Slots"} ${removed} removed — not available for this seat.`;
    setTimeout(() => setRemovedSlotsFeedback(msg), 0);
  }, [activeSeatId, seatBlockedSlots, activeSlots, removeSlotsFromActive]);

  // Auto-clear feedback after 4 seconds
  useEffect(() => {
    if (!removedSlotsFeedback) return;
    const t = setTimeout(() => setRemovedSlotsFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [removedSlotsFeedback]);

  // ── Booking seat map for SeatMapCanvas ────────────────────────────────────

  const bookingSeatMap = useMemo((): Record<
    string,
    { color: string; isActiveDraft: boolean }
  > => {
    const map: Record<string, { color: string; isActiveDraft: boolean }> = {};

    // Stored bookings — only paint seats for the currently selected date
    for (const booking of bookings) {
      if (!booking.seatId) continue;
      if (booking.date !== selectedDate) continue;
      map[booking.seatId] = {
        color: booking.color,
        isActiveDraft: booking.id === editingBookingId,
      };
    }

    // Seat being selected in creating/editing mode
    if (activeSeatId) {
      map[activeSeatId] = { color: activeBookingColor, isActiveDraft: true };
    }

    return map;
  }, [bookings, editingBookingId, activeSeatId, activeBookingColor, selectedDate]);

  // ── Constraints ───────────────────────────────────────────────────────────

  // Total hours locked in on this date (excluding the booking being edited)
  const storedHoursToday = useMemo(
    () =>
      bookings
        .filter((b) => b.date === selectedDate && b.id !== editingBookingId)
        .reduce((sum, b) => sum + b.slots.length, 0),
    [bookings, selectedDate, editingBookingId]
  );

  const canAddMoreSlots = storedHoursToday + activeSlots.length < 8;
  const isValidBooking = activeSlots.length > 0 && !!activeSeatId;
  const todayISO = localDateISO();
  const maxDate = rules ? addLocalDays(todayISO, rules.max_advance_days) : undefined;

  useEffect(() => {
    if (!maxDate) return;
    if (selectedDate > maxDate) {
      setDate(maxDate);
    }
  }, [selectedDate, maxDate, setDate]);

  // ── Seat click handler ────────────────────────────────────────────────────

  function handleSeatClick(seat: Seat) {
    // Seats owned by other bookings on the same date are locked
    const isOtherBooking = bookings.some(
      (b) => b.seatId === seat.id && b.id !== editingBookingId && b.date === selectedDate
    );
    if (isOtherBooking) return;
    if (seat.status !== "available") return;
    if (availabilityMap?.[seat.id] === "booked") return;
    // `my_booking` seats are already owned by the user; block via the
    // time-range availability map (when slots are selected) or via the
    // always-on hourly queries (when no slots are selected yet).
    if (availabilityMap?.[seat.id] === "my_booking" || myBookingSeatIds.has(seat.id)) return;

    if (activeSeatId === seat.id) {
      clearActiveSeat();
    } else {
      setActiveSeat(seat.id, seat.label);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <p className="text-gray-500 p-4">Loading…</p>;
  if (!space) return <p className="text-red-500 p-4">Space not found.</p>;

  const seats = space.seats ?? [];
  const gridSize =
    (space.layout_config as { grid_size?: number } | null)?.grid_size ?? 30;
  const buildingId = space.building_id ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">
          Home
        </Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-gray-700">
          Buildings
        </Link>
        {buildingId && (
          <>
            <span>/</span>
            <Link
              href={`/buildings/${buildingId}`}
              className="hover:text-gray-700"
            >
              Spaces
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 font-medium">{space.name}</span>
      </nav>

      {/* Auto-release warning */}
      {rules?.auto_release_minutes && (
        <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          ⚠ Check in within {rules.auto_release_minutes} min of your start time
          or your booking will be automatically released.
        </div>
      )}

      {/* Three-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(168px,1fr)_2fr_minmax(168px,1fr)] gap-4 items-start">
        {/* Left: Date + Slot picker + booking actions */}
        <SlotPicker
          selectedDate={selectedDate}
          activeSlots={activeSlots}
          hintSlot={hintSlot}
          bookings={bookings}
          editingBookingId={editingBookingId}
          activeBookingColor={activeBookingColor}
          canAddMoreSlots={canAddMoreSlots}
          mode={mode}
          isValidBooking={isValidBooking}
          hasBookings={bookings.length > 0}
          seatBlockedSlots={seatBlockedSlots}
          myBookingSlots={myBookingSlots}
          removedSlotsFeedback={removedSlotsFeedback}
          maxDate={maxDate}
          onDateChange={setDate}
          onToggleSlot={toggleSlot}
          onAddBooking={addBooking}
          onSaveChanges={saveChanges}
          onCancelEditing={cancelEditing}
          onDeleteBooking={() => editingBookingId && deleteBooking(editingBookingId)}
          onCheckout={() => setIsConfirmOpen(true)}
        />

        {/* Center: Seat map */}
        <div className="flex flex-col gap-3">
          <SeatMapCanvas
            seats={seats}
            mode="user"
            availabilityMap={availabilityMap}
            draftSeatMap={bookingSeatMap}
            gridSize={gridSize}
            onSeatClick={handleSeatClick}
          />

          {/* Seat selection hint */}
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {activeSeatId
              ? `Seat ${activeSeatLabel} selected — click to deselect`
              : "Click a seat on the map to include it in this booking"}
          </p>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#1D9E75] inline-block" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#E24B4A] inline-block" />
              Booked
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#378ADD] inline-block" />
              My Booking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#B4B2A9] inline-block" />
              Maintenance
            </span>
          </div>
        </div>

        {/* Right: Booking List */}
        <BookingListPanel
          bookings={bookings}
          editingBookingId={editingBookingId}
          mode={mode}
          onEditBooking={enterEditing}
          onDeleteBooking={deleteBooking}
        />
      </div>

      {/* Confirm modal — rendered inside the floorplan to preserve workspace context */}
      {isConfirmOpen && (
        <ConfirmModal
          bookings={bookings}
          onClose={() => setIsConfirmOpen(false)}
        />
      )}
    </div>
  );
}
