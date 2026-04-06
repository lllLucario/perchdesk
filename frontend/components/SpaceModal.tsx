"use client";

import { useRouter } from "next/navigation";
import { Space, useSpaceRules } from "@/lib/hooks";

interface Props {
  space: Space;
  buildingName?: string;
  onClose: () => void;
}

export default function SpaceModal({ space, buildingName, onClose }: Props) {
  const router = useRouter();
  const { data: rules } = useSpaceRules(space.id);

  function handleBookSeat() {
    onClose();
    router.push(`/spaces/${space.id}`);
  }

  const typeLabel = space.type === "library" ? "Library" : "Office";
  const typeEmoji = space.type === "library" ? "📚" : "💼";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,26,22,0.48)]"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_24px_56px_rgba(22,26,22,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header placeholder */}
        <div className="flex h-28 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(140,173,130,0.32),_transparent_58%),linear-gradient(135deg,_#eef4e8,_#dde6d5)]">
          <span className="text-4xl">{typeEmoji}</span>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(247,250,244,0.92)] text-text-soft shadow-[0_0_0_1px_var(--color-border)] hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="mb-0.5 font-serif text-2xl leading-tight text-foreground">{space.name}</h2>
          <div className="mb-4 flex items-center gap-2 text-sm text-text-muted">
            {buildingName && <span>{buildingName}</span>}
            {buildingName && <span>·</span>}
            <span>{typeLabel}</span>
            <span>·</span>
            <span>{space.capacity} seats</span>
          </div>

          {space.description && (
            <p className="mb-4 text-sm text-text-muted">{space.description}</p>
          )}

          {rules && (
            <div className="mb-5 rounded-[1.25rem] bg-surface-muted p-4 shadow-[0_0_0_1px_var(--color-border)]">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-text-soft">Booking Rules</p>
              <div className="space-y-1 text-sm text-text-strong">
                <p>Max duration: {rules.max_duration_minutes / 60}h per booking</p>
                <p>Book up to: {rules.max_advance_days} days in advance</p>
                <p>
                  Slots:{" "}
                  {rules.time_unit === "hourly"
                    ? "Hourly"
                    : rules.time_unit === "half_day"
                    ? "Half day (AM/PM)"
                    : "Full day"}
                </p>
                {rules.auto_release_minutes && (
                  <p className="text-[color:#8e6b1f]">
                    Auto-released after {rules.auto_release_minutes} min if not checked in
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleBookSeat}
            className="button-primary w-full py-2.5 text-sm font-medium"
          >
            Book a Seat →
          </button>
        </div>
      </div>
    </div>
  );
}
