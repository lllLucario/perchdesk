import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Draft {
  id: string;
  color: string;
  seatId: string | null;
  seatLabel: string | null;
  /** Sorted array of hour-of-day integers, e.g. [8, 9, 14] = 08:00-09:00 + 14:00-15:00 */
  slots: number[];
  /** ISO date string YYYY-MM-DD */
  date: string;
}

export type WorkspaceMode = "browsing" | "creating" | "editing";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DRAFT_COLORS = ["#7C3AED", "#D97706", "#0891B2", "#BE185D", "#15803D"];

/** Max total hours bookable in one space per day (across all drafts). */
export const MAX_DAILY_HOURS = 8;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickNextColor(drafts: Draft[]): string {
  const used = new Set(drafts.map((d) => d.color));
  return DRAFT_COLORS.find((c) => !used.has(c)) ?? DRAFT_COLORS[drafts.length % DRAFT_COLORS.length];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface BookingState {
  mode: WorkspaceMode;
  editingDraftId: string | null;

  /** Selected date for the workspace (shared across modes). */
  selectedDate: string;

  /** Slots being assembled in the current creating/editing session. */
  activeSlots: number[];
  activeSeatId: string | null;
  activeSeatLabel: string | null;
  /** Color assigned to the draft currently being created/edited. */
  activeDraftColor: string;

  /** All saved drafts for this session. */
  drafts: Draft[];

  // ── Actions ──
  setDate: (date: string) => void;
  enterCreating: () => void;
  enterEditing: (draftId: string) => void;
  cancelEditing: () => void;
  toggleSlot: (hour: number) => void;
  setActiveSeat: (seatId: string, seatLabel: string) => void;
  clearActiveSeat: () => void;
  addDraft: () => void;
  saveChanges: () => void;
  deleteDraft: (draftId: string) => void;
  reset: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState>()((set, get) => ({
  mode: "browsing",
  editingDraftId: null,
  selectedDate: todayISO(),
  activeSlots: [],
  activeSeatId: null,
  activeSeatLabel: null,
  activeDraftColor: DRAFT_COLORS[0],
  drafts: [],

  setDate: (date) => set({ selectedDate: date }),

  enterCreating: () => {
    const { drafts } = get();
    set({
      mode: "creating",
      editingDraftId: null,
      activeSlots: [],
      activeSeatId: null,
      activeSeatLabel: null,
      activeDraftColor: pickNextColor(drafts),
    });
  },

  enterEditing: (draftId) => {
    const { drafts } = get();
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;
    set({
      mode: "editing",
      editingDraftId: draftId,
      activeSlots: [...draft.slots],
      activeSeatId: draft.seatId,
      activeSeatLabel: draft.seatLabel,
      activeDraftColor: draft.color,
    });
  },

  cancelEditing: () =>
    set({
      mode: "browsing",
      editingDraftId: null,
      activeSlots: [],
      activeSeatId: null,
      activeSeatLabel: null,
    }),

  toggleSlot: (hour) => {
    const { activeSlots } = get();
    const next = activeSlots.includes(hour)
      ? activeSlots.filter((h) => h !== hour)
      : [...activeSlots, hour].sort((a, b) => a - b);
    set({ activeSlots: next });
  },

  setActiveSeat: (seatId, seatLabel) => set({ activeSeatId: seatId, activeSeatLabel: seatLabel }),

  clearActiveSeat: () => set({ activeSeatId: null, activeSeatLabel: null }),

  addDraft: () => {
    const { activeSlots, activeSeatId, activeSeatLabel, activeDraftColor, selectedDate, drafts } = get();
    if (activeSlots.length === 0 || !activeSeatId) return;
    const newDraft: Draft = {
      id: uid(),
      color: activeDraftColor,
      seatId: activeSeatId,
      seatLabel: activeSeatLabel,
      slots: [...activeSlots],
      date: selectedDate,
    };
    set({
      drafts: [...drafts, newDraft],
      mode: "browsing",
      editingDraftId: null,
      activeSlots: [],
      activeSeatId: null,
      activeSeatLabel: null,
    });
  },

  saveChanges: () => {
    const { editingDraftId, activeSlots, activeSeatId, activeSeatLabel, selectedDate, drafts } = get();
    if (!editingDraftId) return;
    set({
      drafts: drafts.map((d) =>
        d.id === editingDraftId
          ? { ...d, slots: [...activeSlots], seatId: activeSeatId, seatLabel: activeSeatLabel, date: selectedDate }
          : d
      ),
      mode: "browsing",
      editingDraftId: null,
      activeSlots: [],
      activeSeatId: null,
      activeSeatLabel: null,
    });
  },

  deleteDraft: (draftId) => {
    const { drafts, editingDraftId } = get();
    set({
      drafts: drafts.filter((d) => d.id !== draftId),
      ...(editingDraftId === draftId
        ? {
            mode: "browsing" as WorkspaceMode,
            editingDraftId: null,
            activeSlots: [],
            activeSeatId: null,
            activeSeatLabel: null,
          }
        : {}),
    });
  },

  reset: () =>
    set({
      mode: "browsing",
      editingDraftId: null,
      selectedDate: todayISO(),
      activeSlots: [],
      activeSeatId: null,
      activeSeatLabel: null,
      activeDraftColor: DRAFT_COLORS[0],
      drafts: [],
    }),
}));
