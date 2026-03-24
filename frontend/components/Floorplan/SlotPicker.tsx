"use client";

import type { Draft, WorkspaceMode } from "@/store/bookingStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlotPickerProps {
  selectedDate: string;
  activeSlots: number[];
  drafts: Draft[];
  editingDraftId: string | null;
  activeDraftColor: string;
  /** Whether the user can still add more slots (daily 8h cap). */
  canAddMoreSlots: boolean;
  mode: WorkspaceMode;
  /** True when the active draft has at least one slot and a seat. */
  isValidDraft: boolean;
  hasDrafts: boolean;
  onDateChange: (date: string) => void;
  onToggleSlot: (hour: number) => void;
  onNewDraft: () => void;
  onAddDraft: () => void;
  onSaveChanges: () => void;
  onCancelEditing: () => void;
  onDeleteDraft: () => void;
  onCheckout: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hourly slots 08:00–22:00 (14 blocks). */
const DAY_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlotPicker({
  selectedDate,
  activeSlots,
  drafts,
  editingDraftId,
  activeDraftColor,
  canAddMoreSlots,
  mode,
  isValidDraft,
  hasDrafts,
  onDateChange,
  onToggleSlot,
  onNewDraft,
  onAddDraft,
  onSaveChanges,
  onCancelEditing,
  onDeleteDraft,
  onCheckout,
}: SlotPickerProps) {
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 min-w-0">
      {/* Date picker */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date</p>
        <input
          type="date"
          value={selectedDate}
          min={todayISO}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Slot blocks */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Time Slots
        </p>
        <div className="space-y-0.5 overflow-y-auto max-h-72">
          {DAY_HOURS.map((hour) => {
            const isActive = activeSlots.includes(hour);

            // Slot belongs to a stored draft (not the one being edited)
            const storedDraft = drafts.find(
              (d) =>
                d.date === selectedDate &&
                d.slots.includes(hour) &&
                d.id !== editingDraftId
            );

            const isOtherDraft = !!storedDraft;
            const isDisabled =
              isOtherDraft ||
              (mode !== "browsing" && !isActive && !canAddMoreSlots);

            const bgColor = isActive
              ? activeDraftColor
              : isOtherDraft
              ? storedDraft.color
              : null;

            const bgStyle = bgColor
              ? { backgroundColor: `${bgColor}${isActive ? "2e" : "1a"}` }
              : {};

            return (
              <button
                key={hour}
                role="option"
                aria-selected={isActive}
                disabled={isDisabled || mode === "browsing"}
                onClick={() => !isDisabled && onToggleSlot(hour)}
                className={[
                  "w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                  isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : mode !== "browsing"
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "cursor-default",
                  isActive ? "font-medium" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  ...bgStyle,
                  border: isActive ? `1.5px solid ${bgColor}` : "1.5px solid transparent",
                }}
              >
                <span style={isActive ? { color: activeDraftColor } : { color: "#6B7280" }}>
                  {pad(hour)}:00–{pad(hour + 1)}:00
                </span>
                {isActive && (
                  <span style={{ color: activeDraftColor }} aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Draft action buttons */}
      <div className="space-y-2">
        {mode === "browsing" && (
          <>
            <button
              onClick={onNewDraft}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              New Draft
            </button>
            {hasDrafts && (
              <button
                onClick={onCheckout}
                className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Checkout
              </button>
            )}
          </>
        )}

        {mode === "creating" && (
          <>
            <button
              onClick={onAddDraft}
              disabled={!isValidDraft}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Add Draft
            </button>
            <button
              onClick={onCancelEditing}
              className="w-full border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {mode === "editing" && (
          <>
            <button
              onClick={onSaveChanges}
              disabled={!isValidDraft}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={onCancelEditing}
              className="w-full border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onDeleteDraft}
              className="w-full border border-red-200 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Delete Draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}
