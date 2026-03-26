import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  color: string;
  seatId: string | null;
  seatLabel: string | null;
  /** Sorted array of hour-of-day integers, e.g. [8, 9, 14] = 08:00-09:00 + 14:00-15:00 */
  slots: number[];
  /** ISO date string YYYY-MM-DD */
  date: string;
}

export type WorkspaceMode = "creating" | "editing";

// ─── Constants ────────────────────────────────────────────────────────────────

export const BOOKING_COLORS = ["#7C3AED", "#D97706", "#0891B2", "#BE185D", "#15803D"];

/** Max total hours bookable in one space per day (across all bookings). */
export const MAX_DAILY_HOURS = 8;

const SLOT_START_HOUR = 8;
const SLOT_END_HOUR = 21;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickNextColor(bookings: Booking[]): string {
  const used = new Set(bookings.map((b) => b.color));
  return BOOKING_COLORS.find((c) => !used.has(c)) ?? BOOKING_COLORS[bookings.length % BOOKING_COLORS.length];
}

/** Returns YYYY-MM-DD in the local calendar, not UTC. */
function localDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Kept for call-site compatibility; delegates to localDateISO.
function todayISO(): string {
  return localDateISO(new Date());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateISO(date: Date): string {
  return localDateISO(date);
}

function defaultWorkspaceSelection(now = new Date()) {
  const currentHour = now.getHours();
  const exactHour =
    now.getMinutes() === 0 && now.getSeconds() === 0 && now.getMilliseconds() === 0;

  if (currentHour < SLOT_START_HOUR) {
    return {
      selectedDate: dateISO(now),
      activeSlots: [SLOT_START_HOUR],
    };
  }

  if (currentHour > SLOT_END_HOUR || (currentHour === SLOT_END_HOUR && !exactHour)) {
    return {
      selectedDate: dateISO(addDays(now, 1)),
      activeSlots: [SLOT_START_HOUR],
    };
  }

  const slotHour = exactHour ? currentHour : currentHour + 1;

  if (slotHour > SLOT_END_HOUR) {
    return {
      selectedDate: dateISO(addDays(now, 1)),
      activeSlots: [SLOT_START_HOUR],
    };
  }

  return {
    selectedDate: dateISO(now),
    activeSlots: [slotHour],
  };
}

/** Returns the default pre-selected slots for a given date string. */
function nextSlotsForDate(date: string, now = new Date()): number[] {
  const today = dateISO(now);
  if (date !== today) return [SLOT_START_HOUR];
  return defaultWorkspaceSelection(now).activeSlots;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Checkout result types ────────────────────────────────────────────────────

export interface BookingResult {
  /** The plan-level booking item this result came from. */
  planId: string;
  planColor: string;
  seatLabel: string | null;
  /** ISO datetime range for this individual booking. */
  start: string;
  end: string;
  /** Filled on success. */
  bookingId: string | null;
  status: "success" | "error";
  errorMessage: string | null;
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface BookingState {
  mode: WorkspaceMode;
  editingBookingId: string | null;

  /** Selected date for the workspace (shared across modes). */
  selectedDate: string;

  /** Slots being assembled in the current creating/editing session. */
  activeSlots: number[];
  activeSeatId: string | null;
  activeSeatLabel: string | null;
  /** Color assigned to the booking currently being created/edited. */
  activeBookingColor: string;

  /** All saved bookings for this session (the Booking List). */
  bookings: Booking[];

  /**
   * Results from the most recent checkout submission.
   * Populated by the confirm modal after API calls complete.
   * Null means no checkout has been attempted yet.
   */
  checkoutResults: BookingResult[] | null;

  // ── Actions ──
  setDate: (date: string) => void;
  enterEditing: (bookingId: string) => void;
  cancelEditing: () => void;
  toggleSlot: (hour: number) => void;
  setActiveSeat: (seatId: string, seatLabel: string) => void;
  clearActiveSeat: () => void;
  addBooking: () => void;
  saveChanges: () => void;
  deleteBooking: (bookingId: string) => void;
  removeSlotsFromActive: (slots: number[]) => void;
  setCheckoutResults: (results: BookingResult[]) => void;
  reset: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState>()((set, get) => ({
  ...defaultWorkspaceSelection(),
  mode: "creating",
  editingBookingId: null,
  activeSeatId: null,
  activeSeatLabel: null,
  activeBookingColor: BOOKING_COLORS[0],
  bookings: [],
  checkoutResults: null,

  setDate: (date) =>
    set({ selectedDate: date, activeSlots: nextSlotsForDate(date) }),

  enterEditing: (bookingId) => {
    const { bookings } = get();
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;
    set({
      mode: "editing",
      editingBookingId: bookingId,
      selectedDate: booking.date,
      activeSlots: [...booking.slots],
      activeSeatId: booking.seatId,
      activeSeatLabel: booking.seatLabel,
      activeBookingColor: booking.color,
    });
  },

  cancelEditing: () => {
    const { selectedDate } = get();
    set({
      mode: "creating",
      editingBookingId: null,
      activeSlots: nextSlotsForDate(selectedDate),
      activeSeatId: null,
      activeSeatLabel: null,
    });
  },

  toggleSlot: (hour) => {
    const { activeSlots } = get();
    const next = activeSlots.includes(hour)
      ? activeSlots.filter((h) => h !== hour)
      : [...activeSlots, hour].sort((a, b) => a - b);
    set({ activeSlots: next });
  },

  setActiveSeat: (seatId, seatLabel) => set({ activeSeatId: seatId, activeSeatLabel: seatLabel }),

  clearActiveSeat: () => set({ activeSeatId: null, activeSeatLabel: null }),

  addBooking: () => {
    const { activeSlots, activeSeatId, activeSeatLabel, activeBookingColor, selectedDate, bookings } = get();
    if (activeSlots.length === 0 || !activeSeatId) return;
    const newBooking: Booking = {
      id: uid(),
      color: activeBookingColor,
      seatId: activeSeatId,
      seatLabel: activeSeatLabel,
      slots: [...activeSlots],
      date: selectedDate,
    };
    const newBookings = [...bookings, newBooking];
    set({
      bookings: newBookings,
      mode: "creating",
      editingBookingId: null,
      activeSlots: nextSlotsForDate(selectedDate),
      activeSeatId: null,
      activeSeatLabel: null,
      activeBookingColor: pickNextColor(newBookings),
    });
  },

  saveChanges: () => {
    const { editingBookingId, activeSlots, activeSeatId, activeSeatLabel, selectedDate, bookings } = get();
    if (!editingBookingId) return;
    const newBookings = bookings.map((b) =>
      b.id === editingBookingId
        ? { ...b, slots: [...activeSlots], seatId: activeSeatId, seatLabel: activeSeatLabel, date: selectedDate }
        : b
    );
    set({
      bookings: newBookings,
      mode: "creating",
      editingBookingId: null,
      activeSlots: nextSlotsForDate(selectedDate),
      activeSeatId: null,
      activeSeatLabel: null,
      activeBookingColor: pickNextColor(newBookings),
    });
  },

  deleteBooking: (bookingId) => {
    const { bookings, editingBookingId, selectedDate } = get();
    const newBookings = bookings.filter((b) => b.id !== bookingId);
    set({
      bookings: newBookings,
      ...(editingBookingId === bookingId
        ? {
            mode: "creating" as WorkspaceMode,
            editingBookingId: null,
            activeSlots: nextSlotsForDate(selectedDate),
            activeSeatId: null,
            activeSeatLabel: null,
            activeBookingColor: pickNextColor(newBookings),
          }
        : {}),
    });
  },

  removeSlotsFromActive: (slots) => {
    const { activeSlots } = get();
    const slotsToRemove = new Set(slots);
    set({ activeSlots: activeSlots.filter((h) => !slotsToRemove.has(h)) });
  },

  setCheckoutResults: (results) => set({ checkoutResults: results, bookings: [] }),

  reset: () =>
    set({
      ...defaultWorkspaceSelection(),
      mode: "creating",
      editingBookingId: null,
      activeSeatId: null,
      activeSeatLabel: null,
      activeBookingColor: BOOKING_COLORS[0],
      bookings: [],
      checkoutResults: null,
    }),
}));

// ─── Deprecated aliases — remove once all consumers are updated ───────────────

/** @deprecated Use `Booking` instead. */
export type Draft = Booking;
/** @deprecated Use `BOOKING_COLORS` instead. */
export const DRAFT_COLORS = BOOKING_COLORS;
