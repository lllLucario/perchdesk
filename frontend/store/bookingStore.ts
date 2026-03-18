import { create } from "zustand";

interface Seat {
  id: string;
  label: string;
  position: { x: number; y: number };
  status: string;
}

interface BookingState {
  selectedSeat: Seat | null;
  selectedStartTime: Date | null;
  selectedEndTime: Date | null;
  selectSeat: (seat: Seat | null) => void;
  setTimeRange: (start: Date | null, end: Date | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>()((set) => ({
  selectedSeat: null,
  selectedStartTime: null,
  selectedEndTime: null,
  selectSeat: (seat) => set({ selectedSeat: seat }),
  setTimeRange: (start, end) =>
    set({ selectedStartTime: start, selectedEndTime: end }),
  reset: () =>
    set({ selectedSeat: null, selectedStartTime: null, selectedEndTime: null }),
}));
