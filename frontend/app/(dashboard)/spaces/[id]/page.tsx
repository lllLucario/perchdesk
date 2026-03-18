"use client";

import { use, useState, useMemo } from "react";
import {
  useSpace,
  useSpaceRules,
  useSpaceAvailability,
  useCreateBooking,
  type Seat,
  type SeatAvailability,
} from "@/lib/hooks";
import { useBookingStore } from "@/store/bookingStore";
import { ApiError } from "@/lib/api";
import SeatMapCanvas from "@/components/SeatMap/SeatMapCanvas";

/** Round a Date up to the next whole hour. */
function nextHour(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/** Format a Date as the value expected by <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Return the slot options for half_day / full_day pickers. */
function buildSlots(timeUnit: "half_day" | "full_day", maxAdvanceDays: number) {
  const slots: { label: string; start: string; end: string }[] = [];
  const now = new Date();

  for (let d = 1; d <= maxAdvanceDays; d++) {
    const base = new Date(now);
    base.setDate(base.getDate() + d);
    base.setHours(0, 0, 0, 0);

    if (timeUnit === "half_day") {
      const noon = new Date(base);
      noon.setHours(12);
      const nextDay = new Date(base);
      nextDay.setDate(nextDay.getDate() + 1);
      const fmt = (x: Date) =>
        x.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
      slots.push({
        label: `${fmt(base)} AM (00:00–12:00)`,
        start: base.toISOString(),
        end: noon.toISOString(),
      });
      slots.push({
        label: `${fmt(base)} PM (12:00–00:00)`,
        start: noon.toISOString(),
        end: nextDay.toISOString(),
      });
    } else {
      const nextDay = new Date(base);
      nextDay.setDate(nextDay.getDate() + 1);
      const fmt = (x: Date) =>
        x.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
      slots.push({
        label: `${fmt(base)} (full day)`,
        start: base.toISOString(),
        end: nextDay.toISOString(),
      });
    }
  }
  return slots;
}

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: space, isLoading } = useSpace(id);
  const { data: rules } = useSpaceRules(id);
  const { selectedSeat, selectSeat } = useBookingStore();
  const createBooking = useCreateBooking();

  // hourly: free datetime-local inputs
  const [startTime, setStartTime] = useState(() => toLocalInput(nextHour()));
  const [endTime, setEndTime] = useState(() =>
    toLocalInput(nextHour(new Date(nextHour().getTime() + 3600000)))
  );

  // half_day / full_day: slot picker
  const [selectedSlot, setSelectedSlot] = useState("");

  const [message, setMessage] = useState("");

  const timeUnit = rules?.time_unit ?? "hourly";
  const slots = timeUnit !== "hourly" ? buildSlots(timeUnit, rules?.max_advance_days ?? 7) : [];

  // Resolve start/end for availability query
  const [availStart, availEnd] = useMemo(() => {
    if (timeUnit === "hourly") {
      return [
        startTime ? new Date(startTime).toISOString() : "",
        endTime ? new Date(endTime).toISOString() : "",
      ];
    }
    if (selectedSlot) {
      const slot = JSON.parse(selectedSlot) as { start: string; end: string };
      return [slot.start, slot.end];
    }
    return ["", ""];
  }, [timeUnit, startTime, endTime, selectedSlot]);

  const { data: availability } = useSpaceAvailability(id, availStart, availEnd);

  const availabilityMap = useMemo(() => {
    if (!availability) return undefined;
    return Object.fromEntries(
      availability.map((s: SeatAvailability) => [s.id, s.booking_status])
    );
  }, [availability]);

  const seats = (space as unknown as { seats?: Seat[] })?.seats ?? [];
  const gridSize =
    (space?.layout_config as { grid_size?: number } | null)?.grid_size ?? 30;

  async function handleBook() {
    if (!selectedSeat) return;
    setMessage("");

    let start: string;
    let end: string;

    if (timeUnit === "hourly") {
      if (!startTime || !endTime) return;
      start = new Date(startTime).toISOString();
      end = new Date(endTime).toISOString();
    } else {
      if (!selectedSlot) return;
      const slot = JSON.parse(selectedSlot) as { start: string; end: string };
      start = slot.start;
      end = slot.end;
    }

    try {
      await createBooking.mutateAsync({ seat_id: selectedSeat.id, start_time: start, end_time: end });
      setMessage("Booking confirmed!");
      selectSeat(null);
      setSelectedSlot("");
    } catch (e) {
      setMessage(e instanceof ApiError ? `Error: ${e.message}` : "Booking failed.");
    }
  }

  function handleSeatClick(seat: Seat) {
    const avail = availabilityMap?.[seat.id];
    if (seat.status !== "available" || avail === "booked") return;
    selectSeat(
      selectedSeat?.id === seat.id
        ? null
        : { id: seat.id, label: seat.label, position: seat.position, status: seat.status }
    );
  }

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (!space) return <p className="text-red-500">Space not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{space.name}</h1>
      <p className="text-sm text-gray-500 mb-1 capitalize">
        {space.type} · {space.capacity} seats
      </p>
      {rules && (
        <p className="text-xs text-gray-400 mb-6">
          Max {rules.max_duration_minutes} min · up to {rules.max_advance_days} days ahead ·{" "}
          {rules.time_unit.replace("_", " ")} bookings
        </p>
      )}

      {/* Auto-release warning */}
      {rules?.auto_release_minutes && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⚠ Check in within {rules.auto_release_minutes} minutes of your start time or your
          booking will be automatically released.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat map */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Select a seat</h2>
          <SeatMapCanvas
            seats={seats}
            mode="user"
            availabilityMap={availabilityMap}
            selectedSeatId={selectedSeat?.id}
            gridSize={gridSize}
            onSeatClick={handleSeatClick}
          />
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded inline-block bg-[#1D9E75]" /> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded inline-block bg-[#378ADD]" /> Selected / My booking
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded inline-block bg-[#E24B4A]" /> Booked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded inline-block bg-[#B4B2A9]" /> Maintenance
            </span>
          </div>
        </div>

        {/* Booking panel */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Book a seat</h2>
          {selectedSeat ? (
            <p className="text-sm text-blue-600 font-medium mb-3">
              Seat {selectedSeat.label} selected
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Click a seat on the map</p>
          )}

          <div className="space-y-3">
            {timeUnit === "hourly" ? (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1">Start time (on the hour)</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">End time (on the hour)</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">
                  {timeUnit === "half_day" ? "Select half-day slot" : "Select day"}
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Choose a slot…</option>
                  {slots.map((s) => (
                    <option key={s.start} value={JSON.stringify({ start: s.start, end: s.end })}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {message && (
              <p
                className={`text-xs ${
                  message.startsWith("Error") ? "text-red-500" : "text-green-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              onClick={handleBook}
              disabled={
                !selectedSeat ||
                (timeUnit === "hourly" ? !startTime || !endTime : !selectedSlot) ||
                createBooking.isPending
              }
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createBooking.isPending ? "Booking…" : "Confirm Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
