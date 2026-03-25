"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  useSpace,
  useSpaceRules,
  type Seat,
  type SeatAvailability,
} from "@/lib/hooks";
import { api } from "@/lib/api";
import { useBookingStore } from "@/store/bookingStore";
import SeatMapCanvas from "@/components/SeatMap/SeatMapCanvas";
import SlotPicker from "@/components/Floorplan/SlotPicker";
import BookingDraftsPanel from "@/components/Floorplan/BookingDraftsPanel";

/** ISO datetime from a YYYY-MM-DD date and an hour-of-day integer. */
function toISO(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00`;
}

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

export default function SpaceFloorplanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: space, isLoading } = useSpace(id);
  const { data: rules } = useSpaceRules(id);

  const {
    mode,
    selectedDate,
    activeSlots,
    activeSeatId,
    activeSeatLabel,
    activeDraftColor,
    drafts,
    editingDraftId,
    setDate,
    enterCreating,
    enterEditing,
    cancelEditing,
    toggleSlot,
    setActiveSeat,
    clearActiveSeat,
    addDraft,
    saveChanges,
    deleteDraft,
  } = useBookingStore();

  // ── Availability query ────────────────────────────────────────────────────

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

  // ── Draft seat map for SeatMapCanvas ─────────────────────────────────────

  const draftSeatMap = useMemo((): Record<
    string,
    { color: string; isActiveDraft: boolean }
  > => {
    const map: Record<string, { color: string; isActiveDraft: boolean }> = {};

    // Stored drafts
    for (const draft of drafts) {
      if (!draft.seatId) continue;
      map[draft.seatId] = {
        color: draft.color,
        isActiveDraft: draft.id === editingDraftId,
      };
    }

    // Seat being selected in creating mode
    if (mode === "creating" && activeSeatId) {
      map[activeSeatId] = { color: activeDraftColor, isActiveDraft: true };
    }

    return map;
  }, [drafts, editingDraftId, mode, activeSeatId, activeDraftColor]);

  // ── Constraints ───────────────────────────────────────────────────────────

  // Total hours locked in on this date (excluding the draft being edited)
  const storedHoursToday = useMemo(
    () =>
      drafts
        .filter((d) => d.date === selectedDate && d.id !== editingDraftId)
        .reduce((sum, d) => sum + d.slots.length, 0),
    [drafts, selectedDate, editingDraftId]
  );

  const canAddMoreSlots = storedHoursToday + activeSlots.length < 8;
  const isValidDraft = activeSlots.length > 0 && !!activeSeatId;

  // ── Seat click handler ────────────────────────────────────────────────────

  function handleSeatClick(seat: Seat) {
    if (mode === "browsing") {
      // Clicking a draft-owned seat enters editing for that draft
      const owningDraft = drafts.find((d) => d.seatId === seat.id);
      if (owningDraft) enterEditing(owningDraft.id);
      return;
    }

    // Creating / editing: seats owned by other drafts are locked
    const isOtherDraft = drafts.some(
      (d) => d.seatId === seat.id && d.id !== editingDraftId
    );
    if (isOtherDraft) return;
    if (seat.status !== "available") return;
    if (availabilityMap?.[seat.id] === "booked") return;

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
        {/* Left: Date + Slot picker + draft actions */}
        <SlotPicker
          selectedDate={selectedDate}
          activeSlots={activeSlots}
          drafts={drafts}
          editingDraftId={editingDraftId}
          activeDraftColor={activeDraftColor}
          canAddMoreSlots={canAddMoreSlots}
          mode={mode}
          isValidDraft={isValidDraft}
          hasDrafts={drafts.length > 0}
          onDateChange={setDate}
          onToggleSlot={toggleSlot}
          onNewDraft={enterCreating}
          onAddDraft={addDraft}
          onSaveChanges={saveChanges}
          onCancelEditing={cancelEditing}
          onDeleteDraft={() => editingDraftId && deleteDraft(editingDraftId)}
          onCheckout={() => router.push("/confirm")}
        />

        {/* Center: Seat map */}
        <div className="flex flex-col gap-3">
          <SeatMapCanvas
            seats={seats}
            mode="user"
            availabilityMap={availabilityMap}
            draftSeatMap={draftSeatMap}
            gridSize={gridSize}
            onSeatClick={handleSeatClick}
          />

          {/* Seat selection hint */}
          {(mode === "creating" || mode === "editing") && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              {activeSeatId
                ? `Seat ${activeSeatLabel} selected — click to deselect`
                : "Click a seat on the map to include it in this draft"}
            </p>
          )}

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
              <span className="w-3 h-3 rounded bg-[#B4B2A9] inline-block" />
              Maintenance
            </span>
          </div>
        </div>

        {/* Right: Booking Drafts panel */}
        <BookingDraftsPanel
          drafts={drafts}
          editingDraftId={editingDraftId}
          mode={mode}
          onEditDraft={enterEditing}
          onDeleteDraft={deleteDraft}
        />
      </div>
    </div>
  );
}
