"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBookingStore, type BookingResult } from "@/store/bookingStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRange(start: string, end: string): string {
  // start = "2026-03-25T08:00:00", extract time part
  const startTime = start.slice(11, 16); // "08:00"
  const endTime = end.slice(11, 16); // "10:00"
  return `${startTime}–${endTime}`;
}

function formatDate(isoDateTime: string): string {
  // "2026-03-25T08:00:00" → "2026-03-25"
  return isoDateTime.slice(0, 10);
}

// ─── ResultRow ────────────────────────────────────────────────────────────────

function ResultRow({ result }: { result: BookingResult }) {
  const isSuccess = result.status === "success";

  return (
    <div
      className={[
        "border rounded-xl p-4 flex items-start gap-3",
        isSuccess
          ? "border-green-100 bg-green-50"
          : "border-red-100 bg-red-50",
      ].join(" ")}
    >
      {/* Status icon */}
      <span
        className={[
          "mt-0.5 text-lg leading-none",
          isSuccess ? "text-green-600" : "text-red-500",
        ].join(" ")}
        aria-hidden
      >
        {isSuccess ? "✓" : "✗"}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: result.planColor }}
          />
          <span className="text-sm font-medium text-gray-900">
            Seat {result.seatLabel ?? "—"}
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(result.start)} · {formatRange(result.start, result.end)}
          </span>
        </div>

        {isSuccess ? (
          <p className="text-xs text-green-700 mt-1">
            Booking confirmed
            {result.bookingId && (
              <span className="text-green-600 opacity-70"> · #{result.bookingId.slice(0, 8)}</span>
            )}
          </p>
        ) : (
          <p className="text-xs text-red-600 mt-1">
            {result.errorMessage ?? "Booking failed"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── ResultPage ───────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const { checkoutResults, reset } = useBookingStore();

  // No results means user navigated here directly without going through checkout
  if (!checkoutResults) {
    return (
      <div className="flex flex-col gap-6">
        <nav className="text-sm text-gray-500 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Booking Result</span>
        </nav>
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">Nothing to show</p>
          <p className="text-sm mb-6">Complete the booking flow to see your results here.</p>
          <Link
            href="/buildings"
            className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Spaces
          </Link>
        </div>
      </div>
    );
  }

  const succeeded = checkoutResults.filter((r) => r.status === "success");
  const failed = checkoutResults.filter((r) => r.status === "error");
  const isAllSuccess = failed.length === 0;
  const isAllFailed = succeeded.length === 0;
  const isPartial = succeeded.length > 0 && failed.length > 0;

  function handleDone() {
    reset();
    router.push("/bookings");
  }

  function handleBookAgain() {
    reset();
    router.push("/buildings");
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Booking Result</span>
      </nav>

      {/* Summary banner */}
      <div
        className={[
          "rounded-2xl px-5 py-4 border",
          isAllSuccess
            ? "bg-green-50 border-green-100"
            : isAllFailed
            ? "bg-red-50 border-red-100"
            : "bg-amber-50 border-amber-100",
        ].join(" ")}
      >
        <h1
          className={[
            "text-lg font-semibold",
            isAllSuccess
              ? "text-green-800"
              : isAllFailed
              ? "text-red-800"
              : "text-amber-800",
          ].join(" ")}
        >
          {isAllSuccess && "All bookings confirmed!"}
          {isAllFailed && "Bookings failed"}
          {isPartial && "Partially confirmed"}
        </h1>
        <p
          className={[
            "text-sm mt-1",
            isAllSuccess
              ? "text-green-700"
              : isAllFailed
              ? "text-red-700"
              : "text-amber-700",
          ].join(" ")}
        >
          {isAllSuccess &&
            `${succeeded.length} ${succeeded.length === 1 ? "booking" : "bookings"} successfully created.`}
          {isAllFailed &&
            `All ${failed.length} ${failed.length === 1 ? "booking" : "bookings"} could not be created.`}
          {isPartial &&
            `${succeeded.length} succeeded, ${failed.length} failed. Check the details below.`}
        </p>
      </div>

      {/* Individual results */}
      <div className="flex flex-col gap-2">
        {checkoutResults.map((result, i) => (
          <ResultRow key={`${result.planId}-${i}`} result={result} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        {!isAllFailed && (
          <button
            onClick={handleDone}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            View My Bookings
          </button>
        )}
        <button
          onClick={handleBookAgain}
          className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Book Another Space
        </button>
      </div>
    </div>
  );
}
