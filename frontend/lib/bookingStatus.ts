/**
 * Booking status derivation and display utilities for the My Bookings page.
 *
 * Backend statuses (confirmed, checked_in, cancelled, expired) are mapped to
 * user-facing UX statuses using the booking's time range and the current time.
 */
import type { Booking } from "@/lib/hooks";

const SYDNEY_TZ = "Australia/Sydney";

export type UXStatus =
  | "Booked"              // confirmed, start_time > now
  | "Check-in Available"  // confirmed, start_time <= now
  | "In Use"              // checked_in, end_time > now
  | "Completed"           // checked_in, end_time <= now
  | "Cancelled"
  | "Expired";

/** Derive the user-facing status from a booking and the current time. */
export function deriveUXStatus(booking: Booking, now: Date = new Date()): UXStatus {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);

  switch (booking.status) {
    case "confirmed":
      return now >= start ? "Check-in Available" : "Booked";
    case "checked_in":
      return now < end ? "In Use" : "Completed";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Expired";
  }
}

/** Returns the tab a booking belongs to based on its UX status. */
export function getBookingTab(uxStatus: UXStatus): "active" | "history" {
  if (["Booked", "Check-in Available", "In Use"].includes(uxStatus)) return "active";
  return "history";
}

// ─── Display utilities ────────────────────────────────────────────────────────

/** "Mar 27, 2026" */
export function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    timeZone: SYDNEY_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "09:00" */
export function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-AU", {
    timeZone: SYDNEY_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "2h", "1h 30m", "30m" */
export function formatDuration(startISO: string, endISO: string): string {
  const diffMin = (new Date(endISO).getTime() - new Date(startISO).getTime()) / 60_000;
  const hours = Math.floor(diffMin / 60);
  const mins = Math.round(diffMin % 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Relative time hint shown below booking card fields (active only). */
export function relativeTimeHint(
  uxStatus: UXStatus,
  startISO: string,
  now: Date = new Date()
): string {
  if (uxStatus === "Booked") {
    const diffMs = new Date(startISO).getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin >= 24 * 60) return `Starts in ${Math.round(diffMin / (24 * 60))}d`;
    if (diffMin >= 60) return `Starts in ${Math.round(diffMin / 60)}h`;
    return `Starts in ${diffMin}m`;
  }
  if (uxStatus === "Check-in Available") return "Check-in window open";
  if (uxStatus === "In Use") return "In progress";
  return "";
}

/** Badge colour classes per UX status. */
export const STATUS_BADGE: Record<UXStatus, string> = {
  Booked: "bg-blue-100 text-blue-700",
  "Check-in Available": "bg-amber-100 text-amber-700",
  "In Use": "bg-green-100 text-green-700",
  Completed: "bg-gray-100 text-gray-600",
  Cancelled: "bg-gray-100 text-gray-500",
  Expired: "bg-red-100 text-red-500",
};
