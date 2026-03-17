"use client";

import { useBookings, useCancelBooking, useCheckIn } from "@/lib/hooks";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
  expired: "bg-red-100 text-red-500",
};

export default function BookingsPage() {
  const { data: bookings, isLoading } = useBookings();
  const cancelBooking = useCancelBooking();
  const checkIn = useCheckIn();

  if (isLoading) return <p className="text-gray-500">Loading bookings…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
      {bookings?.length === 0 && (
        <p className="text-gray-500">No bookings yet. <a href="/spaces" className="text-blue-600 hover:underline">Browse spaces</a></p>
      )}
      <div className="space-y-3">
        {bookings?.map((booking) => (
          <div key={booking.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] ?? "bg-gray-100"}`}>
                  {booking.status}
                </span>
              </div>
              <p className="text-sm text-gray-800">
                {formatDate(booking.start_time)} → {formatDate(booking.end_time)}
              </p>
            </div>
            <div className="flex gap-2">
              {booking.status === "confirmed" && (
                <>
                  <button
                    onClick={() => checkIn.mutate(booking.id)}
                    disabled={checkIn.isPending}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Check In
                  </button>
                  <button
                    onClick={() => cancelBooking.mutate(booking.id)}
                    disabled={cancelBooking.isPending}
                    className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
