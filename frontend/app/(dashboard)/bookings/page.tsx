"use client";

import Link from "next/link";
import { useState } from "react";
import { useBookings, useCancelBooking, useCheckIn, type Booking } from "@/lib/hooks";
import {
  deriveUXStatus,
  getBookingTab,
  formatDateLabel,
  formatTimeLabel,
  formatDuration,
  relativeTimeHint,
  STATUS_BADGE,
  type UXStatus,
} from "@/lib/bookingStatus";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "active" | "history";

// ─── Booking card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  uxStatus: UXStatus;
}

function BookingCard({ booking, uxStatus }: BookingCardProps) {
  const cancelBooking = useCancelBooking();
  const checkIn = useCheckIn();

  const dateLabel = formatDateLabel(booking.start_time);
  const timeRange = `${formatTimeLabel(booking.start_time)}–${formatTimeLabel(booking.end_time)}`;
  const duration = formatDuration(booking.start_time, booking.end_time);
  const hint = relativeTimeHint(uxStatus, booking.start_time);

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{booking.space_name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[uxStatus]}`}
            >
              {uxStatus}
            </span>
          </div>
          {booking.building_name && (
            <p className="text-sm text-gray-500 mb-1">{booking.building_name}</p>
          )}
          <p className="text-sm text-gray-700">
            {dateLabel} &nbsp;·&nbsp; {timeRange} &nbsp;·&nbsp; Seat {booking.seat_label} &nbsp;·&nbsp; {duration}
          </p>
          {hint && (
            <p className="text-xs text-gray-500 mt-1">{hint}</p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {uxStatus === "Booked" && (
          <button
            onClick={() => cancelBooking.mutate(booking.id)}
            disabled={cancelBooking.isPending}
            className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        {uxStatus === "Check-in Available" && (
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
        {/* In Use, Completed, Cancelled, Expired: no mutation actions */}
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function ActiveEmpty() {
  return (
    <div className="text-center py-16 text-gray-500">
      <p className="text-base font-medium text-gray-700 mb-1">No active bookings</p>
      <p className="text-sm mb-4">You have no upcoming or in-progress bookings.</p>
      <Link
        href="/buildings"
        className="text-sm text-blue-600 hover:underline"
      >
        Browse spaces to make a booking
      </Link>
    </div>
  );
}

function HistoryEmpty() {
  return (
    <div className="text-center py-16 text-gray-500">
      <p className="text-base font-medium text-gray-700 mb-1">No booking history yet</p>
      <p className="text-sm">Your completed, cancelled, and expired bookings will appear here.</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const { data: bookings, isLoading } = useBookings();

  const now = new Date();

  // Derive UX status and split into tab groups
  const annotated = (bookings ?? []).map((b) => ({
    booking: b,
    uxStatus: deriveUXStatus(b, now),
  }));

  const activeBookings = annotated.filter(({ uxStatus }) => getBookingTab(uxStatus) === "active");
  const historyBookings = annotated.filter(({ uxStatus }) => getBookingTab(uxStatus) === "history");

  if (isLoading) return <p className="text-gray-500">Loading bookings…</p>;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active Bookings", count: activeBookings.length },
    { key: "history", label: "Booking History", count: historyBookings.length },
  ];

  const visibleBookings = activeTab === "active" ? activeBookings : historyBookings;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>

      {/* Tab row */}
      <div className="flex gap-1 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {visibleBookings.length === 0 ? (
        activeTab === "active" ? <ActiveEmpty /> : <HistoryEmpty />
      ) : (
        <div className="space-y-3">
          {visibleBookings.map(({ booking, uxStatus }) => (
            <BookingCard key={booking.id} booking={booking} uxStatus={uxStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
