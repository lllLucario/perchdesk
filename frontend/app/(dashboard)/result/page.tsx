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
        "flex items-start gap-3 rounded-[1.35rem] border p-4",
        isSuccess
          ? "border-[color:color-mix(in_srgb,var(--color-accent)_20%,white_80%)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,white_90%)]"
          : "border-[color:color-mix(in_srgb,var(--color-danger)_24%,white_76%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)]",
      ].join(" ")}
    >
      {/* Status icon */}
      <span
        className={[
          "mt-0.5 text-lg leading-none",
          isSuccess ? "text-accent" : "text-danger",
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
          <span className="text-sm font-medium text-foreground">
            Seat {result.seatLabel ?? "—"}
          </span>
          <span className="text-xs text-text-muted">
            {formatDate(result.start)} · {formatRange(result.start, result.end)}
          </span>
        </div>

        {isSuccess ? (
          <p className="mt-1 text-xs text-text-strong">
            Booking confirmed
            {result.bookingId && (
              <span className="text-accent opacity-70"> · #{result.bookingId.slice(0, 8)}</span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-danger">
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
        <nav className="flex items-center gap-2 text-sm text-text-soft">
          <Link href="/" className="hover:text-text-strong">Home</Link>
          <span>/</span>
          <span className="font-medium text-foreground">Booking Result</span>
        </nav>
        <div className="py-16 text-center text-text-soft">
          <p className="mb-2 font-serif text-3xl text-foreground">Nothing to show</p>
          <p className="mb-6 text-sm">Complete the booking flow to see your results here.</p>
          <Link
            href="/buildings"
            className="button-primary inline-block px-4 py-2 text-sm font-medium"
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
      <nav className="flex items-center gap-2 text-sm text-text-soft">
        <Link href="/" className="hover:text-text-strong">Home</Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-text-strong">Buildings</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Booking Result</span>
      </nav>

      {/* Summary banner */}
      <div
        className={[
          "rounded-[1.7rem] border px-5 py-4",
          isAllSuccess
            ? "border-[color:color-mix(in_srgb,var(--color-accent)_20%,white_80%)] bg-[color:color-mix(in_srgb,var(--color-accent)_10%,white_90%)]"
            : isAllFailed
            ? "border-[color:color-mix(in_srgb,var(--color-danger)_22%,white_78%)] bg-[color:color-mix(in_srgb,var(--color-danger)_8%,white_92%)]"
            : "border-[color:#dec78e] bg-[color:#f6efdc]",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <h1
          className={[
            "font-serif text-3xl leading-tight",
            isAllSuccess
              ? "text-text-strong"
              : isAllFailed
              ? "text-danger"
              : "text-[color:#8e6b1f]",
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
              ? "text-text-muted"
              : isAllFailed
              ? "text-danger"
              : "text-[color:#8e6b1f]",
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
            className="button-primary w-full py-3 text-sm font-medium"
          >
            View My Bookings
          </button>
        )}
        <button
          onClick={handleBookAgain}
          className="button-secondary w-full py-3 text-sm font-medium"
        >
          Book Another Space
        </button>
      </div>
    </div>
  );
}
