"use client";

import { use, useState } from "react";
import { useSpace, useCreateBooking } from "@/lib/hooks";
import { useBookingStore } from "@/store/bookingStore";
import { ApiError } from "@/lib/api";

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: space, isLoading } = useSpace(id);
  const { selectedSeat, selectSeat } = useBookingStore();
  const createBooking = useCreateBooking();

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");

  async function handleBook() {
    if (!selectedSeat || !startTime || !endTime) return;
    setMessage("");
    try {
      await createBooking.mutateAsync({
        seat_id: selectedSeat.id,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setMessage("Booking confirmed!");
      selectSeat(null);
      setStartTime("");
      setEndTime("");
    } catch (e) {
      if (e instanceof ApiError) {
        setMessage(`Error: ${e.message}`);
      } else {
        setMessage("Booking failed.");
      }
    }
  }

  if (isLoading) return <p className="text-gray-500">Loading…</p>;
  if (!space) return <p className="text-red-500">Space not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{space.name}</h1>
      <p className="text-sm text-gray-500 mb-6 capitalize">{space.type} · {space.capacity} seats</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seat grid */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-3">Select a seat</h2>
          <div className="bg-white border rounded-xl p-4">
            <div className="flex flex-wrap gap-2">
              {(space as unknown as { seats?: Array<{ id: string; label: string; status: string }> }).seats?.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => selectSeat(seat.status === "available" ? { id: seat.id, label: seat.label, position: { x: 0, y: 0 }, status: seat.status } : null)}
                  disabled={seat.status !== "available"}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedSeat?.id === seat.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : seat.status === "available"
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  }`}
                >
                  {seat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300 inline-block" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Selected</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Unavailable</span>
            </div>
          </div>
        </div>

        {/* Booking panel */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Book a seat</h2>
          {selectedSeat ? (
            <p className="text-sm text-blue-600 font-medium mb-3">Seat {selectedSeat.label} selected</p>
          ) : (
            <p className="text-sm text-gray-400 mb-3">Select a seat from the map</p>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Start time</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">End time</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            {message && (
              <p className={`text-xs ${message.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
                {message}
              </p>
            )}
            <button
              onClick={handleBook}
              disabled={!selectedSeat || !startTime || !endTime || createBooking.isPending}
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
