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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "active" | "history";

type AnnotatedBooking = { booking: Booking; uxStatus: UXStatus };

// ─── Filter / sort config ─────────────────────────────────────────────────────

const ACTIVE_FILTERS: UXStatus[] = ["Booked", "Check-in Available", "In Use"];
const HISTORY_FILTERS: UXStatus[] = ["Completed", "Expired", "Cancelled"];

const ACTIVE_SORTS = [
  "Start time: soonest",
  "Start time: latest",
  "Duration: longest",
  "Duration: shortest",
] as const;

const HISTORY_SORTS = [
  "Most recent",
  "Oldest",
  "Duration: longest",
  "Duration: shortest",
] as const;

type ActiveSort = (typeof ACTIVE_SORTS)[number];
type HistorySort = (typeof HISTORY_SORTS)[number];

function durationMinutes(b: Booking) {
  return (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60_000;
}

function applyActiveFilterSort(
  items: AnnotatedBooking[],
  filter: UXStatus | "All",
  sort: ActiveSort
): AnnotatedBooking[] {
  const filtered =
    filter === "All" ? items : items.filter(({ uxStatus }) => uxStatus === filter);

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case "Start time: soonest":
        return new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime();
      case "Start time: latest":
        return new Date(b.booking.start_time).getTime() - new Date(a.booking.start_time).getTime();
      case "Duration: longest":
        return durationMinutes(b.booking) - durationMinutes(a.booking);
      case "Duration: shortest":
        return durationMinutes(a.booking) - durationMinutes(b.booking);
    }
  });
}

function applyHistoryFilterSort(
  items: AnnotatedBooking[],
  filter: UXStatus | "All",
  sort: HistorySort
): AnnotatedBooking[] {
  const filtered =
    filter === "All" ? items : items.filter(({ uxStatus }) => uxStatus === filter);

  return [...filtered].sort((a, b) => {
    switch (sort) {
      case "Most recent":
        return new Date(b.booking.start_time).getTime() - new Date(a.booking.start_time).getTime();
      case "Oldest":
        return new Date(a.booking.start_time).getTime() - new Date(b.booking.start_time).getTime();
      case "Duration: longest":
        return durationMinutes(b.booking) - durationMinutes(a.booking);
      case "Duration: shortest":
        return durationMinutes(a.booking) - durationMinutes(b.booking);
    }
  });
}

// ─── Control row ──────────────────────────────────────────────────────────────

interface FilterRowProps<S extends string> {
  filters: string[];
  activeFilter: string;
  onFilterChange: (f: string) => void;
  sorts: readonly S[];
  activeSort: S;
  onSortChange: (s: S) => void;
}

function ControlRow<S extends string>({
  filters,
  activeFilter,
  onFilterChange,
  sorts,
  activeSort,
  onSortChange,
}: FilterRowProps<S>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {["All", ...filters].map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeFilter === f
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="sm:ml-auto shrink-0">
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as S)}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Sort bookings"
        >
          {sorts.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

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
        <div className="min-w-0 flex-1">
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
          <p className="text-sm text-gray-600">
            {dateLabel}
            <span className="mx-1.5 text-gray-300">·</span>
            {timeRange}
            <span className="mx-1.5 text-gray-300">·</span>
            Seat {booking.seat_label}
            <span className="mx-1.5 text-gray-300">·</span>
            {duration}
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
        {/* In Use: no action buttons */}
        {/* History statuses: no action buttons */}
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function ActiveEmpty({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No bookings match the selected filter.</p>
      </div>
    );
  }
  return (
    <div className="text-center py-16 text-gray-500">
      <p className="text-base font-medium text-gray-700 mb-1">No active bookings</p>
      <p className="text-sm mb-4">You have no upcoming or in-progress bookings.</p>
      <Link href="/buildings" className="text-sm text-blue-600 hover:underline">
        Browse spaces to make a booking
      </Link>
    </div>
  );
}

function HistoryEmpty({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No bookings match the selected filter.</p>
      </div>
    );
  }
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

  const [activeFilter, setActiveFilter] = useState<UXStatus | "All">("All");
  const [activeSort, setActiveSort] = useState<ActiveSort>("Start time: soonest");
  const [historyFilter, setHistoryFilter] = useState<UXStatus | "All">("All");
  const [historySort, setHistorySort] = useState<HistorySort>("Most recent");

  const { data: bookings, isLoading } = useBookings();

  const now = new Date();

  const annotated = (bookings ?? []).map((b) => ({
    booking: b,
    uxStatus: deriveUXStatus(b, now),
  }));

  const allActiveBookings = annotated.filter(({ uxStatus }) => getBookingTab(uxStatus) === "active");
  const allHistoryBookings = annotated.filter(({ uxStatus }) => getBookingTab(uxStatus) === "history");

  const visibleActive = applyActiveFilterSort(allActiveBookings, activeFilter, activeSort);
  const visibleHistory = applyHistoryFilterSort(allHistoryBookings, historyFilter, historySort);

  if (isLoading) return <p className="text-gray-500">Loading bookings…</p>;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active Bookings", count: allActiveBookings.length },
    { key: "history", label: "Booking History", count: allHistoryBookings.length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>

      {/* Tab row */}
      <div className="flex gap-1 border-b mb-5">
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

      {/* Active tab */}
      {activeTab === "active" && (
        <>
          <ControlRow
            filters={ACTIVE_FILTERS}
            activeFilter={activeFilter}
            onFilterChange={(f) => setActiveFilter(f as UXStatus | "All")}
            sorts={ACTIVE_SORTS}
            activeSort={activeSort}
            onSortChange={setActiveSort}
          />
          {visibleActive.length === 0 ? (
            <ActiveEmpty filtered={activeFilter !== "All"} />
          ) : (
            <div className="space-y-3">
              {visibleActive.map(({ booking, uxStatus }) => (
                <BookingCard key={booking.id} booking={booking} uxStatus={uxStatus} />
              ))}
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <>
          <ControlRow
            filters={HISTORY_FILTERS}
            activeFilter={historyFilter}
            onFilterChange={(f) => setHistoryFilter(f as UXStatus | "All")}
            sorts={HISTORY_SORTS}
            activeSort={historySort}
            onSortChange={setHistorySort}
          />
          {visibleHistory.length === 0 ? (
            <HistoryEmpty filtered={historyFilter !== "All"} />
          ) : (
            <div className="space-y-3">
              {visibleHistory.map(({ booking, uxStatus }) => (
                <BookingCard key={booking.id} booking={booking} uxStatus={uxStatus} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
