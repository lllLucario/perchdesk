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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header placeholder */}
        <div className="h-28 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-4xl">{typeEmoji}</span>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-0.5">{space.name}</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            {buildingName && <span>{buildingName}</span>}
            {buildingName && <span>·</span>}
            <span>{typeLabel}</span>
            <span>·</span>
            <span>{space.capacity} seats</span>
          </div>

          {space.description && (
            <p className="text-sm text-gray-600 mb-4">{space.description}</p>
          )}

          {rules && (
            <div className="mb-5 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Booking Rules</p>
              <div className="space-y-1 text-sm text-gray-700">
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
                  <p className="text-amber-600">
                    Auto-released after {rules.auto_release_minutes} min if not checked in
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleBookSeat}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Book a Seat →
          </button>
        </div>
      </div>
    </div>
  );
}
