"use client";

import type { Draft, WorkspaceMode } from "@/store/bookingStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Collapse a sorted array of hours into contiguous range strings, e.g. [8,9,14] → "08:00–10:00, 14:00–15:00". */
function formatSlotSummary(slots: number[]): string {
  if (slots.length === 0) return "No slots selected";
  const sorted = [...slots].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push([start, end]);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push([start, end]);

  return ranges
    .map(([s, e]) => `${String(s).padStart(2, "0")}:00–${String(e + 1).padStart(2, "0")}:00`)
    .join(", ");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDraftsPanelProps {
  drafts: Draft[];
  editingDraftId: string | null;
  mode: WorkspaceMode;
  onEditDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingDraftsPanel({
  drafts,
  editingDraftId,
  mode,
  onEditDraft,
  onDeleteDraft,
}: BookingDraftsPanelProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Booking Drafts
      </p>

      {drafts.length === 0 ? (
        <p className="text-sm text-gray-400">
          No drafts yet. Click &ldquo;New Draft&rdquo; to start.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => {
            const isEditing = draft.id === editingDraftId;

            return (
              <div
                key={draft.id}
                className="rounded-xl p-3 transition-all"
                style={{
                  border: isEditing
                    ? `2px solid ${draft.color}`
                    : `1.5px solid ${draft.color}33`,
                  backgroundColor: isEditing ? `${draft.color}14` : `${draft.color}08`,
                }}
              >
                {/* Color dot + seat label */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: draft.color }}
                  />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {draft.seatLabel ? `Seat ${draft.seatLabel}` : "No seat yet"}
                  </span>
                  {isEditing && (
                    <span
                      className="ml-auto text-xs font-semibold flex-shrink-0"
                      style={{ color: draft.color }}
                    >
                      Editing
                    </span>
                  )}
                </div>

                {/* Slot summary */}
                <p className="text-xs text-gray-500 mb-0.5">{formatSlotSummary(draft.slots)}</p>

                {/* Duration */}
                <p className="text-xs text-gray-400 mb-2">{draft.slots.length}h total</p>

                {/* Card actions (browsing only — editing controls are in left column) */}
                {mode === "browsing" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEditDraft(draft.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteDraft(draft.id)}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
