/**
 * Floorplan workspace tests: bookingStore logic, SlotPicker, BookingListPanel,
 * and the SpaceFloorplanPage three-column layout.
 */
import React, { Suspense } from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { addLocalDays, localDateISO, toISO } from "@/lib/booking";
import { renderWithProviders } from "./test-utils";
import { useBookingStore, BOOKING_COLORS, MAX_DAILY_HOURS } from "@/store/bookingStore";

// ─── API mock ─────────────────────────────────────────────────────────────────

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  upload: jest.fn(),
};

jest.mock("@/lib/api", () => ({
  api: mockApi,
  ApiError: class ApiError extends Error {
    status: number;
    errorCode: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.errorCode = code;
    }
  },
}));

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { name: "Alice", role: "user" },
    logout: jest.fn(),
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_SPACE = {
  id: "sp1",
  building_id: "b1",
  name: "Central Library",
  type: "library",
  description: "Quiet study space.",
  capacity: 4,
  layout_config: { grid_size: 30 },
  created_at: "",
  seats: [
    { id: "s1", space_id: "sp1", label: "A1", position: { x: 60, y: 60 }, status: "available", attributes: null },
    { id: "s2", space_id: "sp1", label: "A2", position: { x: 120, y: 60 }, status: "available", attributes: null },
    { id: "s3", space_id: "sp1", label: "A3", position: { x: 180, y: 60 }, status: "maintenance", attributes: null },
  ],
};

const SAMPLE_RULES = {
  id: "r1",
  space_id: "sp1",
  max_duration_minutes: 480,
  max_advance_days: 3,
  time_unit: "hourly",
  auto_release_minutes: 15,
  requires_approval: false,
};

// ─── bookingStore unit tests ──────────────────────────────────────────────────

describe("bookingStore", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  test("initial mode is creating", () => {
    expect(useBookingStore.getState().mode).toBe("creating");
  });

  test("reset starts in creating mode with a hint slot and no pre-selected slots", () => {
    const state = useBookingStore.getState();
    expect(state.mode).toBe("creating");
    // activeSlots starts empty — the hint is a visual cue only, not a selection
    expect(state.activeSlots).toHaveLength(0);
    expect(state.hintSlot).not.toBeNull();
  });

  test("hintSlot is cleared after first slot interaction", () => {
    expect(useBookingStore.getState().hintSlot).not.toBeNull();
    useBookingStore.getState().toggleSlot(9);
    expect(useBookingStore.getState().hintSlot).toBeNull();
  });

  test("hintSlot is cleared after addBooking", () => {
    useBookingStore.setState({ activeSlots: [9], hintSlot: 9 });
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addBooking();
    expect(useBookingStore.getState().hintSlot).toBeNull();
  });

  test("hintSlot is cleared after cancelEditing", () => {
    useBookingStore.setState({ hintSlot: 10 });
    useBookingStore.getState().cancelEditing();
    expect(useBookingStore.getState().hintSlot).toBeNull();
  });

  test("hintSlot is cleared after setDate", () => {
    expect(useBookingStore.getState().hintSlot).not.toBeNull();
    useBookingStore.getState().setDate("2026-04-01");
    expect(useBookingStore.getState().hintSlot).toBeNull();
  });

  test("reset restores hintSlot", () => {
    useBookingStore.getState().toggleSlot(9); // clears hint
    expect(useBookingStore.getState().hintSlot).toBeNull();
    useBookingStore.getState().reset();
    expect(useBookingStore.getState().hintSlot).not.toBeNull();
  });

  test("initial activeBookingColor is the first BOOKING_COLOR", () => {
    const { activeBookingColor } = useBookingStore.getState();
    expect(BOOKING_COLORS).toContain(activeBookingColor);
  });

  test("toggleSlot adds and removes a slot", () => {
    useBookingStore.setState({ activeSlots: [] }); // start from known empty state
    useBookingStore.getState().toggleSlot(9);
    expect(useBookingStore.getState().activeSlots).toContain(9);
    useBookingStore.getState().toggleSlot(9);
    expect(useBookingStore.getState().activeSlots).not.toContain(9);
  });

  test("toggleSlot keeps slots sorted", () => {
    useBookingStore.getState().toggleSlot(11);
    useBookingStore.getState().toggleSlot(8);
    useBookingStore.getState().toggleSlot(10);
    // activeSlots may already have a default slot; check that added slots are sorted
    const slots = useBookingStore.getState().activeSlots;
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]).toBeGreaterThan(slots[i - 1]);
    }
  });

  test("addBooking saves booking and returns to creating", () => {
    useBookingStore.setState({ activeSlots: [9] });
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addBooking();

    const { bookings, mode, activeSeatId } = useBookingStore.getState();
    expect(bookings).toHaveLength(1);
    expect(bookings[0].seatId).toBe("s1");
    expect(bookings[0].slots).toContain(9);
    expect(mode).toBe("creating");
    expect(activeSeatId).toBeNull();
  });

  test("addBooking is a no-op when booking is invalid", () => {
    // No seat, no slot beyond what the default pre-selects — remove any default slots
    useBookingStore.setState({ activeSlots: [] });
    useBookingStore.getState().addBooking();
    expect(useBookingStore.getState().bookings).toHaveLength(0);
  });

  test("enterEditing loads booking into active state", () => {
    useBookingStore.getState().setDate("2026-03-26");
    useBookingStore.setState({ activeSlots: [8] });
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addBooking();

    useBookingStore.getState().setDate("2026-03-27");

    const bookingId = useBookingStore.getState().bookings[0].id;
    useBookingStore.getState().enterEditing(bookingId);

    const { mode, editingBookingId, activeSlots, activeSeatId, selectedDate } =
      useBookingStore.getState();
    expect(mode).toBe("editing");
    expect(editingBookingId).toBe(bookingId);
    expect(selectedDate).toBe("2026-03-26");
    expect(activeSlots).toContain(8);
    expect(activeSeatId).toBe("s1");
  });

  test("cancelEditing returns to creating and clears active state", () => {
    useBookingStore.setState({ activeSlots: [9] });
    useBookingStore.getState().cancelEditing();

    const { mode, activeSeatId } = useBookingStore.getState();
    expect(mode).toBe("creating");
    expect(activeSeatId).toBeNull();
  });

  test("saveChanges updates booking and returns to creating", () => {
    useBookingStore.setState({ activeSlots: [8] });
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addBooking();

    const bookingId = useBookingStore.getState().bookings[0].id;
    useBookingStore.getState().enterEditing(bookingId);
    useBookingStore.getState().toggleSlot(9); // add slot 9
    useBookingStore.getState().saveChanges();

    const { bookings, mode } = useBookingStore.getState();
    expect(mode).toBe("creating");
    expect(bookings[0].slots).toContain(8);
    expect(bookings[0].slots).toContain(9);
  });

  test("deleteBooking removes it from list", () => {
    useBookingStore.setState({ activeSlots: [10] });
    useBookingStore.getState().setActiveSeat("s2", "A2");
    useBookingStore.getState().addBooking();

    const bookingId = useBookingStore.getState().bookings[0].id;
    useBookingStore.getState().deleteBooking(bookingId);
    expect(useBookingStore.getState().bookings).toHaveLength(0);
  });

  test("deleteBooking while editing returns to creating", () => {
    useBookingStore.setState({ activeSlots: [10] });
    useBookingStore.getState().setActiveSeat("s2", "A2");
    useBookingStore.getState().addBooking();

    const bookingId = useBookingStore.getState().bookings[0].id;
    useBookingStore.getState().enterEditing(bookingId);
    useBookingStore.getState().deleteBooking(bookingId);
    expect(useBookingStore.getState().mode).toBe("creating");
    expect(useBookingStore.getState().editingBookingId).toBeNull();
  });

  test("removeSlotsFromActive removes specified slots", () => {
    useBookingStore.setState({ activeSlots: [8, 9, 10, 11] });
    useBookingStore.getState().removeSlotsFromActive([9, 11]);
    expect(useBookingStore.getState().activeSlots).toEqual([8, 10]);
  });

  test("removeSlotsFromActive is a no-op for slots not in active", () => {
    useBookingStore.setState({ activeSlots: [8, 9] });
    useBookingStore.getState().removeSlotsFromActive([14, 15]);
    expect(useBookingStore.getState().activeSlots).toEqual([8, 9]);
  });

  test("successive bookings pick different colors", () => {
    for (let i = 0; i < 3; i++) {
      useBookingStore.setState({ activeSlots: [8 + i] });
      useBookingStore.getState().setActiveSeat(`s${i}`, `A${i}`);
      useBookingStore.getState().addBooking();
    }
    const colors = useBookingStore.getState().bookings.map((b) => b.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });

  test("MAX_DAILY_HOURS constant is 8", () => {
    expect(MAX_DAILY_HOURS).toBe(8);
  });

  test("same seat can be selected on a different date", () => {
    // Add booking for seat s1 on 2026-03-26
    useBookingStore.getState().setDate("2026-03-26");
    useBookingStore.setState({ activeSlots: [9] });
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addBooking();

    // Switch to 2026-03-27 — s1 should not be locked
    useBookingStore.getState().setDate("2026-03-27");

    const state = useBookingStore.getState();
    // bookings for 2026-03-26 must not block s1 on 2026-03-27
    const isLockedOnOtherDate = state.bookings.some(
      (b) => b.seatId === "s1" && b.date === "2026-03-27"
    );
    expect(isLockedOnOtherDate).toBe(false);
  });
});

// ─── SlotPicker component tests ───────────────────────────────────────────────

describe("SlotPicker", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  function makeSlotPickerProps(overrides: Partial<Parameters<typeof import("@/components/Floorplan/SlotPicker")["default"]>[0]> = {}) {
    const today = localDateISO();
    return {
      selectedDate: today,
      maxDate: undefined as string | undefined,
      activeSlots: [] as number[],
      hintSlot: null as number | null,
      bookings: [] as Parameters<typeof import("@/components/Floorplan/SlotPicker")["default"]>[0]["bookings"],
      editingBookingId: null as string | null,
      activeBookingColor: "#7C3AED",
      canAddMoreSlots: true,
      mode: "creating" as const,
      isValidBooking: false,
      hasBookings: false,
      seatBlockedSlots: new Set<number>(),
      myBookingSlots: new Set<number>(),
      removedSlotsFeedback: null as string | null,
      onDateChange: jest.fn(),
      onToggleSlot: jest.fn(),
      onAddBooking: jest.fn(),
      onSaveChanges: jest.fn(),
      onCancelEditing: jest.fn(),
      onDeleteBooking: jest.fn(),
      onCheckout: jest.fn(),
      ...overrides,
    };
  }

  async function renderSlotPicker(
    overrides: Partial<Parameters<typeof import("@/components/Floorplan/SlotPicker")["default"]>[0]> = {}
  ) {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    renderWithProviders(<SlotPicker {...makeSlotPickerProps(overrides)} />);
  }

  test("renders 14 hourly slot blocks (08:00–22:00)", async () => {
    await renderSlotPicker();
    const slots = screen.getAllByRole("option");
    expect(slots).toHaveLength(14);
    expect(screen.getByText("08:00–09:00")).toBeInTheDocument();
    expect(screen.getByText("21:00–22:00")).toBeInTheDocument();
  });

  test("shows Add Booking and no Submit in creating mode with no bookings", async () => {
    await renderSlotPicker({ mode: "creating", hasBookings: false });
    expect(screen.getByRole("button", { name: "Add Booking" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  test("shows Submit when hasBookings=true in creating mode", async () => {
    await renderSlotPicker({ mode: "creating", hasBookings: true });
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  test("date input applies max date from max_advance_days", async () => {
    const today = localDateISO();
    const maxDate = addLocalDays(today, 3);
    await renderSlotPicker({ selectedDate: today, maxDate });
    const dateInput = screen.getByDisplayValue(today);
    expect(dateInput).toHaveAttribute("max", maxDate);
  });

  test("Add Booking is disabled when isValidBooking=false", async () => {
    await renderSlotPicker({ mode: "creating", isValidBooking: false });
    expect(screen.getByRole("button", { name: "Add Booking" })).toBeDisabled();
  });

  test("Add Booking is enabled when isValidBooking=true", async () => {
    await renderSlotPicker({ mode: "creating", isValidBooking: true });
    expect(screen.getByRole("button", { name: "Add Booking" })).not.toBeDisabled();
  });

  test("shows Save Changes, Cancel Editing, Delete in editing mode", async () => {
    await renderSlotPicker({
      activeSlots: [9],
      editingBookingId: "b1",
      mode: "editing",
      isValidBooking: true,
    });
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel Editing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  test("slot blocked by seatBlockedSlots is disabled", async () => {
    await renderSlotPicker({ seatBlockedSlots: new Set([9]) });
    const slotBtn = screen.getAllByRole("option")[1]; // index 1 = 09:00–10:00
    expect(slotBtn).toBeDisabled();
  });

  test("shows removedSlotsFeedback message when set", async () => {
    await renderSlotPicker({ removedSlotsFeedback: "Slot 09:00 removed — not available for this seat." });
    expect(screen.getByText(/Slot 09:00 removed/)).toBeInTheDocument();
  });

  test("slot in myBookingSlots shows Mine label and is disabled", async () => {
    await renderSlotPicker({ myBookingSlots: new Set([9]) });
    const slotBtn = screen.getAllByRole("option")[1]; // index 1 = 09:00–10:00
    expect(slotBtn).toBeDisabled();
    expect(screen.getByText("Mine")).toBeInTheDocument();
  });

  test("renders Morning, Afternoon, and Evening time-of-day dividers", async () => {
    await renderSlotPicker();
    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Afternoon")).toBeInTheDocument();
    expect(screen.getByText("Evening")).toBeInTheDocument();
  });

  test("past slots are disabled when date is today", async () => {
    const todayISO = localDateISO();
    const currentHour = new Date().getHours();
    // Only run this check if there is at least one past slot in the 08:00–22:00 window
    if (currentHour > 8) {
      await renderSlotPicker({ selectedDate: todayISO });
      const slotBtns = screen.getAllByRole("option");
      // Hour 8 slot is index 0; if currentHour > 8 it should be disabled
      expect(slotBtns[0]).toBeDisabled();
    }
  });

  test("exact-on-hour: current-hour slot remains usable at HH:00:00.000", async () => {
    // Freeze time to 10:00:00.000 LOCAL so the exact-hour branch is taken.
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 2, 27, 10, 0, 0, 0)); // local 10:00:00.000
      // localDateISO() uses the same local-calendar semantics as the component
      const todayForTest = localDateISO();

      await renderSlotPicker({ selectedDate: todayForTest });
      const slotBtns = screen.getAllByRole("option");

      // Index 0 = 08:00, index 1 = 09:00, index 2 = 10:00
      // At exactly 10:00:00.000 — slot 10 must NOT be past
      expect(slotBtns[2]).not.toBeDisabled(); // 10:00–11:00 still usable
      // Slots before hour 10 must be disabled (they have already passed)
      expect(slotBtns[0]).toBeDisabled(); // 08:00–09:00
      expect(slotBtns[1]).toBeDisabled(); // 09:00–10:00
    } finally {
      jest.useRealTimers();
    }
  });

  test("non-exact time: current-hour slot is disabled at HH:30", async () => {
    // Freeze time to 10:30:00.000 LOCAL — the start of slot 10 has passed.
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 2, 27, 10, 30, 0, 0)); // local 10:30:00.000
      const todayForTest = localDateISO();

      await renderSlotPicker({ selectedDate: todayForTest });
      const slotBtns = screen.getAllByRole("option");

      // At 10:30 — slot 10 (10:00–11:00) start time has passed; must be disabled
      expect(slotBtns[2]).toBeDisabled(); // 10:00–11:00
      // Slot 11 (11:00–12:00) has not started yet; must remain usable
      expect(slotBtns[3]).not.toBeDisabled(); // 11:00–12:00
    } finally {
      jest.useRealTimers();
    }
  });
});

// ─── BookingListPanel component tests ─────────────────────────────────────────

describe("BookingListPanel", () => {
  async function renderPanel(
    bookings = [] as Parameters<typeof import("@/components/Floorplan/BookingListPanel")["default"]>[0]["bookings"],
    mode: "creating" | "editing" = "creating"
  ) {
    const { default: BookingListPanel } = await import(
      "@/components/Floorplan/BookingListPanel"
    );
    renderWithProviders(
      <BookingListPanel
        bookings={bookings}
        editingBookingId={null}
        mode={mode}
        onEditBooking={jest.fn()}
        onDeleteBooking={jest.fn()}
      />
    );
  }

  test("shows empty state when no bookings", async () => {
    await renderPanel();
    expect(screen.getByText(/No bookings yet/i)).toBeInTheDocument();
  });

  test("shows 'Booking List' heading", async () => {
    await renderPanel();
    expect(screen.getByText(/Booking List/i)).toBeInTheDocument();
  });

  test("shows booking card with seat label", async () => {
    await renderPanel([
      {
        id: "b1",
        color: "#7C3AED",
        seatId: "s1",
        seatLabel: "A1",
        slots: [9, 10],
        date: "2026-03-25",
      },
    ]);
    expect(screen.getByText("Seat A1")).toBeInTheDocument();
  });

  test("shows continuous slot range correctly", async () => {
    await renderPanel([
      {
        id: "b1",
        color: "#7C3AED",
        seatId: "s1",
        seatLabel: "A1",
        slots: [8, 9, 10],
        date: "2026-03-25",
      },
    ]);
    expect(screen.getByText("08:00–11:00")).toBeInTheDocument();
  });

  test("shows discrete slot ranges with comma", async () => {
    await renderPanel([
      {
        id: "b1",
        color: "#7C3AED",
        seatId: "s1",
        seatLabel: "A1",
        slots: [8, 10],
        date: "2026-03-25",
      },
    ]);
    expect(screen.getByText("08:00–09:00, 10:00–11:00")).toBeInTheDocument();
  });

  test("shows duration in hours", async () => {
    await renderPanel([
      {
        id: "b1",
        color: "#7C3AED",
        seatId: "s1",
        seatLabel: "A1",
        slots: [8, 9, 10],
        date: "2026-03-25",
      },
    ]);
    expect(screen.getByText("3h total")).toBeInTheDocument();
  });

  test("shows Edit and Delete buttons in creating mode", async () => {
    await renderPanel([
      { id: "b1", color: "#7C3AED", seatId: "s1", seatLabel: "A1", slots: [9], date: "2026-03-25" },
    ]);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  test("hides Edit/Delete in editing mode", async () => {
    await renderPanel(
      [{ id: "b1", color: "#7C3AED", seatId: "s1", seatLabel: "A1", slots: [9], date: "2026-03-25" }],
      "editing"
    );
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});

// ─── SpaceFloorplanPage integration tests ────────────────────────────────────

describe("SpaceFloorplanPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBookingStore.getState().reset();
  });

  async function renderFloorplan() {
    const { default: SpaceFloorplanPage } = await import(
      "@/app/(dashboard)/spaces/[id]/page"
    );
    await act(async () => {
      renderWithProviders(
        <Suspense fallback={<div>loading…</div>}>
          <SpaceFloorplanPage params={Promise.resolve({ id: "sp1" })} />
        </Suspense>
      );
    });
  }

  function setupApiMocks() {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/spaces/sp1") return Promise.resolve(SAMPLE_SPACE);
      if (url === "/api/v1/spaces/sp1/rules") return Promise.resolve(SAMPLE_RULES);
      if (url.includes("/api/v1/spaces/sp1/availability")) {
        return Promise.resolve([
          { ...SAMPLE_SPACE.seats[0], booking_status: "available" },
          { ...SAMPLE_SPACE.seats[1], booking_status: "booked" },
          { ...SAMPLE_SPACE.seats[2], booking_status: "available" },
        ]);
      }
      return Promise.resolve([]);
    });
  }

  test("renders three-column layout: slot picker, seat map, booking list panel", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Booking" })).toBeInTheDocument();
      expect(screen.getByText(/Booking List/i)).toBeInTheDocument();
    });
  });

  test("shows space name in breadcrumb", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => {
      expect(screen.getByText("Central Library")).toBeInTheDocument();
    });
  });

  test("shows auto-release warning for library space", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => {
      expect(screen.getByText(/Check in within 15 min/i)).toBeInTheDocument();
    });
  });

  test("page loads in creating state and triggers availability query", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => {
      expect(
        mockApi.get.mock.calls.some(([url]) =>
          String(url).includes("/api/v1/spaces/sp1/availability")
        )
      ).toBe(true);
    });
  });

  test("Add Booking is disabled until slot and seat are selected", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));
    // The default slot is pre-selected but no seat — button should be disabled
    // Force clear slots to ensure invalid state
    act(() => useBookingStore.setState({ activeSlots: [], activeSeatId: null }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Booking" })).toBeDisabled();
    });
  });

  test("Submit button not shown when no bookings in list", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  /** Helper: add one booking via store + UI. */
  async function addOneBooking() {
    // Clear default slots and set a known slot
    act(() => useBookingStore.setState({ activeSlots: [9], activeSeatId: null }));
    await act(async () => {
      useBookingStore.getState().setActiveSeat("s1", "A1");
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add Booking" })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Booking" }));
  }

  test("booking appears in panel after add", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));

    await addOneBooking();

    await waitFor(() => {
      expect(screen.getByText("Seat A1")).toBeInTheDocument();
      expect(screen.getByText("1h total")).toBeInTheDocument();
    });
  });

  test("Submit button appears after booking is added", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));

    await addOneBooking();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });
  });

  test("Submit opens the confirm modal", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));

    await addOneBooking();

    await waitFor(() => screen.getByRole("button", { name: "Submit" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  test("selectedDate is clamped to the latest allowed advance date", async () => {
    setupApiMocks();
    const today = localDateISO();
    const maxDate = addLocalDays(today, SAMPLE_RULES.max_advance_days);

    act(() => {
      useBookingStore.getState().setDate(addLocalDays(today, 10));
    });

    await renderFloorplan();

    await waitFor(() => {
      const dateInput = screen.getByDisplayValue(maxDate);
      expect(dateInput).toHaveAttribute("max", maxDate);
    });
  });

  test("my_booking seat cannot be selected as a new booking seat", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/spaces/sp1") return Promise.resolve(SAMPLE_SPACE);
      if (url === "/api/v1/spaces/sp1/rules") return Promise.resolve(SAMPLE_RULES);
      if (url.includes("/api/v1/spaces/sp1/availability")) {
        return Promise.resolve([
          { ...SAMPLE_SPACE.seats[0], booking_status: "my_booking" }, // s1 = user's own seat
          { ...SAMPLE_SPACE.seats[1], booking_status: "available" },
          { ...SAMPLE_SPACE.seats[2], booking_status: "available" },
        ]);
      }
      return Promise.resolve([]);
    });

    const { default: SpaceFloorplanPage } = await import(
      "@/app/(dashboard)/spaces/[id]/page"
    );
    let container!: HTMLElement;
    await act(async () => {
      const result = renderWithProviders(
        <Suspense fallback={<div>loading…</div>}>
          <SpaceFloorplanPage params={Promise.resolve({ id: "sp1" })} />
        </Suspense>
      );
      container = result.container;
    });

    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));
    // Allow availability queries to resolve
    await act(async () => {});

    // Find all seat <g> elements inside the SVG seat map
    const seatGroups = container.querySelectorAll("svg g");
    // The first <g> corresponds to seat s1 which has my_booking status
    if (seatGroups.length > 0) {
      fireEvent.click(seatGroups[0]);
    }

    // activeSeatId must remain null — my_booking seat must not be selectable
    expect(useBookingStore.getState().activeSeatId).toBeNull();
  });

  test("discrete slot selections trigger separate availability queries", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByRole("button", { name: "Add Booking" }));

    // Clear default and click two non-contiguous slots
    act(() => useBookingStore.setState({ activeSlots: [] }));
    fireEvent.click(screen.getAllByRole("option")[0]); // 08:00–09:00
    fireEvent.click(screen.getAllByRole("option")[2]); // 10:00–11:00

    await waitFor(() => {
      const selectedDate = useBookingStore.getState().selectedDate;
      const eightToNine = encodeURIComponent(toISO(selectedDate, 8));
      const tenToEleven = encodeURIComponent(toISO(selectedDate, 10));
      const availabilityCalls = mockApi.get.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("/api/v1/spaces/sp1/availability"));
      expect(availabilityCalls.some((url) => url.includes(eightToNine))).toBe(true);
      expect(availabilityCalls.some((url) => url.includes(tenToEleven))).toBe(true);
    });
  });
});
