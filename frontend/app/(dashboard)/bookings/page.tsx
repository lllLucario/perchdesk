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
import SeatMapCanvas from "@/components/SeatMap/SeatMapCanvas";

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
    <div className="mb-4 flex flex-col gap-2 rounded-[1.5rem] border border-border bg-[color:color-mix(in_srgb,var(--color-accent-muted)_42%,white_58%)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-wrap gap-1.5">
        {["All", ...filters].map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeFilter === f
                ? "bg-accent text-accent-foreground border-accent shadow-[0_10px_20px_rgba(69,95,57,0.16)]"
                : "bg-surface text-text-muted border-border hover:border-border-strong hover:bg-[color:color-mix(in_srgb,var(--color-accent-muted)_42%,white_58%)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="sm:ml-auto shrink-0">
        <select
          value={activeSort}
          onChange={(e) => onSortChange(e.target.value as S)}
          className="rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs text-text-strong focus:outline-none focus:ring-1 focus:ring-accent"
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

// ─── Booking detail modal ─────────────────────────────────────────────────────

interface BookingDetailModalProps {
  booking: Booking;
  uxStatus: UXStatus;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function BookingDetailModal({ booking, uxStatus, onClose }: BookingDetailModalProps) {
  const cancelBooking = useCancelBooking();
  const checkIn = useCheckIn();

  const dateLabel = formatDateLabel(booking.start_time);
  const timeRange = `${formatTimeLabel(booking.start_time)}–${formatTimeLabel(booking.end_time)}`;
  const duration = formatDuration(booking.start_time, booking.end_time);

  const layoutCfg = booking.space_layout_config as {
    width?: number;
    height?: number;
    grid_size?: number;
    background_image?: string | null;
  } | null;

  const canvasWidth = layoutCfg?.width ?? 800;
  const canvasHeight = layoutCfg?.height ?? 600;
  const gridSize = layoutCfg?.grid_size ?? 30;
  const backgroundImage = layoutCfg?.background_image ?? null;

  // Construct a minimal Seat object from the enriched booking fields
  const previewSeat = {
    id: booking.seat_id,
    space_id: booking.space_id,
    label: booking.seat_label,
    position: booking.seat_position,
    status: "available" as const,
    attributes: null,
  };

  const availabilityMap: Record<string, "available" | "booked" | "my_booking"> = {
    [booking.seat_id]: "my_booking",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.8rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-muted)_42%,white_58%),transparent_52%),var(--color-surface)] shadow-[0_24px_56px_rgba(22,26,22,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 pb-3 pt-5">
          <h2 className="font-serif text-2xl leading-tight text-foreground">Booking Details</h2>
          <button
            onClick={onClose}
            className="text-lg leading-none text-text-soft hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Meta */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-foreground">{booking.space_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[uxStatus]}`}>
                {uxStatus}
              </span>
            </div>
            {booking.building_name && (
              <p className="mb-1 text-sm text-text-muted">{booking.building_name}</p>
            )}
            <p className="text-sm text-text-strong">
              {dateLabel} · {timeRange} · Seat {booking.seat_label} · {duration}
            </p>
          </div>

          {/* Detail fields */}
          <dl className="space-y-1 text-sm text-text-muted">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-soft">Booking ID</dt>
              <dd className="font-mono text-xs break-all">{booking.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-text-soft">Created</dt>
              <dd>{formatDateTime(booking.created_at)}</dd>
            </div>
            {booking.checked_in_at && (
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-text-soft">Checked in</dt>
                <dd>{formatDateTime(booking.checked_in_at)}</dd>
              </div>
            )}
          </dl>

          {/* Floorplan preview */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.14em] text-text-soft">Floorplan preview</p>
            {layoutCfg !== null ? (
              <SeatMapCanvas
                seats={[previewSeat]}
                mode="user"
                availabilityMap={availabilityMap}
                width={canvasWidth}
                height={canvasHeight}
                gridSize={gridSize}
                backgroundImage={backgroundImage}
                showGrid={backgroundImage === null}
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-surface-muted text-sm text-text-soft">
                No floorplan available for this space
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="space-y-2 border-t border-border px-6 pb-5 pt-3">
          {(checkIn.error || cancelBooking.error) && (
            <p className="text-xs text-danger">
              {((checkIn.error || cancelBooking.error) as Error).message}
            </p>
          )}
          <div className="flex justify-between items-center gap-3">
            <button
              onClick={onClose}
              className="text-sm text-text-muted hover:text-text-strong"
            >
              Close
            </button>
            <div className="flex gap-2">
              {uxStatus === "Check-in Available" && (
                <button
                  onClick={() => checkIn.mutate(booking.id, { onSuccess: onClose })}
                  disabled={checkIn.isPending}
                  className="button-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  Check In
                </button>
              )}
              {(uxStatus === "Booked" || uxStatus === "Check-in Available") && (
                <button
                  onClick={() => cancelBooking.mutate(booking.id, { onSuccess: onClose })}
                  disabled={cancelBooking.isPending}
                  className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-danger)_28%,white_72%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)] px-4 py-2 text-sm text-danger disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  uxStatus: UXStatus;
  onViewDetails: () => void;
}

function BookingCard({ booking, uxStatus, onViewDetails }: BookingCardProps) {
  const cancelBooking = useCancelBooking();
  const checkIn = useCheckIn();

  const dateLabel = formatDateLabel(booking.start_time);
  const timeRange = `${formatTimeLabel(booking.start_time)}–${formatTimeLabel(booking.end_time)}`;
  const duration = formatDuration(booking.start_time, booking.end_time);
  const hint = relativeTimeHint(uxStatus, booking.start_time);

  return (
    <div className="panel-surface rounded-[1.7rem] border border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-accent-muted)_40%,white_60%),transparent_60%),var(--color-surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="truncate font-serif text-2xl leading-tight text-foreground">{booking.space_name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_BADGE[uxStatus]}`}
            >
              {uxStatus}
            </span>
          </div>
          {booking.building_name && (
            <p className="mb-1 text-sm text-text-muted">{booking.building_name}</p>
          )}
          <p className="text-sm text-text-strong">
            {dateLabel}
            <span className="mx-1.5 text-border-strong">·</span>
            {timeRange}
            <span className="mx-1.5 text-border-strong">·</span>
            Seat {booking.seat_label}
            <span className="mx-1.5 text-border-strong">·</span>
            {duration}
          </p>
          {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <button
          onClick={onViewDetails}
          className="button-secondary px-3 py-1.5 text-xs"
        >
          View Details
        </button>
        {uxStatus === "Booked" && (
          <button
            onClick={() => cancelBooking.mutate(booking.id)}
            disabled={cancelBooking.isPending}
            className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-danger)_28%,white_72%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)] px-3 py-1.5 text-xs text-danger disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        {uxStatus === "Check-in Available" && (
          <>
            <button
              onClick={() => checkIn.mutate(booking.id)}
              disabled={checkIn.isPending}
              className="button-primary px-3 py-1.5 text-xs disabled:opacity-50"
            >
              Check In
            </button>
            <button
              onClick={() => cancelBooking.mutate(booking.id)}
              disabled={cancelBooking.isPending}
              className="rounded-xl border border-[color:color-mix(in_srgb,var(--color-danger)_28%,white_72%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)] px-3 py-1.5 text-xs text-danger disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function ActiveEmpty({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="section-frame py-12 text-center text-text-muted">
        <p className="text-sm">No bookings match the selected filter.</p>
      </div>
    );
  }
  return (
    <div className="section-frame py-16 text-center text-text-muted">
      <p className="mb-1 font-serif text-3xl text-foreground">No active bookings</p>
      <p className="text-sm mb-4">You have no upcoming or in-progress bookings.</p>
      <Link href="/buildings" className="text-sm text-accent hover:text-text-strong">
        Browse spaces to make a booking
      </Link>
    </div>
  );
}

function HistoryEmpty({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div className="section-frame py-12 text-center text-text-muted">
        <p className="text-sm">No bookings match the selected filter.</p>
      </div>
    );
  }
  return (
    <div className="section-frame py-16 text-center text-text-muted">
      <p className="mb-1 font-serif text-3xl text-foreground">No booking history yet</p>
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
  const [modalBooking, setModalBooking] = useState<AnnotatedBooking | null>(null);

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

  if (isLoading) return <p className="text-text-muted">Loading bookings…</p>;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active Bookings", count: allActiveBookings.length },
    { key: "history", label: "Booking History", count: allHistoryBookings.length },
  ];

  return (
    <div className="page-stack">
      <div className="section-frame mb-6 px-6 py-6 md:px-8">
        <p className="section-kicker mb-3">Booking journal</p>
        <h1 className="mb-2 text-4xl text-foreground">My Bookings</h1>
        <p className="text-sm text-text-muted">
          Track what is booked, what needs check-in, and what has already finished.
        </p>
      </div>

      {/* Tab row */}
      <div className="mb-5 flex gap-2 rounded-[1.5rem] border border-border bg-[color:color-mix(in_srgb,var(--color-accent-muted)_44%,white_56%)] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-[1rem] px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-surface text-text-strong shadow-[0_12px_24px_rgba(22,26,22,0.06)]"
                : "text-text-muted hover:text-text-strong"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs text-text-strong">
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
              {visibleActive.map((item) => (
                <BookingCard
                  key={item.booking.id}
                  booking={item.booking}
                  uxStatus={item.uxStatus}
                  onViewDetails={() => setModalBooking(item)}
                />
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
              {visibleHistory.map((item) => (
                <BookingCard
                  key={item.booking.id}
                  booking={item.booking}
                  uxStatus={item.uxStatus}
                  onViewDetails={() => setModalBooking(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {modalBooking && (
        <BookingDetailModal
          booking={modalBooking.booking}
          uxStatus={modalBooking.uxStatus}
          onClose={() => setModalBooking(null)}
        />
      )}
    </div>
  );
}
