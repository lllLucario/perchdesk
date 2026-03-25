/**
 * Floorplan workspace tests: bookingStore logic, SlotPicker, BookingDraftsPanel,
 * and the SpaceFloorplanPage three-column layout.
 */
import React, { Suspense } from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";
import { useBookingStore, DRAFT_COLORS, MAX_DAILY_HOURS } from "@/store/bookingStore";

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
  max_duration_minutes: 240,
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

  test("initial mode is browsing", () => {
    expect(useBookingStore.getState().mode).toBe("browsing");
  });

  test("reset restores a default upcoming slot in browsing mode", () => {
    const state = useBookingStore.getState();
    expect(state.mode).toBe("browsing");
    expect(state.activeSlots.length).toBe(1);
  });

  test("enterCreating switches mode and assigns a color", () => {
    useBookingStore.getState().enterCreating();
    const { mode, activeDraftColor } = useBookingStore.getState();
    expect(mode).toBe("creating");
    expect(DRAFT_COLORS).toContain(activeDraftColor);
  });

  test("toggleSlot adds and removes a slot", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(9);
    expect(useBookingStore.getState().activeSlots).toEqual([9]);
    useBookingStore.getState().toggleSlot(9);
    expect(useBookingStore.getState().activeSlots).toEqual([]);
  });

  test("toggleSlot keeps slots sorted", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(11);
    useBookingStore.getState().toggleSlot(8);
    useBookingStore.getState().toggleSlot(10);
    expect(useBookingStore.getState().activeSlots).toEqual([8, 10, 11]);
  });

  test("addDraft saves draft and returns to browsing", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(9);
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addDraft();

    const { drafts, mode, activeSlots, activeSeatId } = useBookingStore.getState();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].seatId).toBe("s1");
    expect(drafts[0].slots).toEqual([9]);
    expect(mode).toBe("browsing");
    expect(activeSlots).toEqual([]);
    expect(activeSeatId).toBeNull();
  });

  test("addDraft is a no-op when draft is invalid", () => {
    useBookingStore.getState().enterCreating();
    // No seat, no slot
    useBookingStore.getState().addDraft();
    expect(useBookingStore.getState().drafts).toHaveLength(0);
  });

  test("enterEditing loads draft into active state", () => {
    // Create a draft first
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().setDate("2026-03-26");
    useBookingStore.getState().toggleSlot(8);
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addDraft();

    useBookingStore.getState().setDate("2026-03-27");

    const draftId = useBookingStore.getState().drafts[0].id;
    useBookingStore.getState().enterEditing(draftId);

    const { mode, editingDraftId, activeSlots, activeSeatId, selectedDate } = useBookingStore.getState();
    expect(mode).toBe("editing");
    expect(editingDraftId).toBe(draftId);
    expect(selectedDate).toBe("2026-03-26");
    expect(activeSlots).toEqual([8]);
    expect(activeSeatId).toBe("s1");
  });

  test("cancelEditing returns to browsing and clears active state", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(9);
    useBookingStore.getState().cancelEditing();

    const { mode, activeSlots, activeSeatId } = useBookingStore.getState();
    expect(mode).toBe("browsing");
    expect(activeSlots).toEqual([]);
    expect(activeSeatId).toBeNull();
  });

  test("saveChanges updates draft and returns to browsing", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(8);
    useBookingStore.getState().setActiveSeat("s1", "A1");
    useBookingStore.getState().addDraft();

    const draftId = useBookingStore.getState().drafts[0].id;
    useBookingStore.getState().enterEditing(draftId);
    useBookingStore.getState().toggleSlot(9); // add slot 9
    useBookingStore.getState().saveChanges();

    const { drafts, mode } = useBookingStore.getState();
    expect(mode).toBe("browsing");
    expect(drafts[0].slots).toEqual([8, 9]);
  });

  test("deleteDraft removes it from list", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(10);
    useBookingStore.getState().setActiveSeat("s2", "A2");
    useBookingStore.getState().addDraft();

    const draftId = useBookingStore.getState().drafts[0].id;
    useBookingStore.getState().deleteDraft(draftId);
    expect(useBookingStore.getState().drafts).toHaveLength(0);
  });

  test("deleteDraft while editing returns to browsing", () => {
    useBookingStore.getState().enterCreating();
    useBookingStore.getState().toggleSlot(10);
    useBookingStore.getState().setActiveSeat("s2", "A2");
    useBookingStore.getState().addDraft();

    const draftId = useBookingStore.getState().drafts[0].id;
    useBookingStore.getState().enterEditing(draftId);
    useBookingStore.getState().deleteDraft(draftId);
    expect(useBookingStore.getState().mode).toBe("browsing");
    expect(useBookingStore.getState().editingDraftId).toBeNull();
  });

  test("successive drafts pick different colors", () => {
    for (let i = 0; i < 3; i++) {
      useBookingStore.getState().enterCreating();
      useBookingStore.getState().toggleSlot(8 + i);
      useBookingStore.getState().setActiveSeat(`s${i}`, `A${i}`);
      useBookingStore.getState().addDraft();
    }
    const colors = useBookingStore.getState().drafts.map((d) => d.color);
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(3);
  });

  test("MAX_DAILY_HOURS constant is 8", () => {
    expect(MAX_DAILY_HOURS).toBe(8);
  });
});

// ─── SlotPicker component tests ───────────────────────────────────────────────

describe("SlotPicker", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  async function renderSlotPicker() {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    const today = new Date().toISOString().slice(0, 10);
    renderWithProviders(
      <SlotPicker
        selectedDate={today}
        activeSlots={[]}
        drafts={[]}
        editingDraftId={null}
        activeDraftColor="#7C3AED"
        canAddMoreSlots={true}
        mode="browsing"
        isValidDraft={false}
        hasDrafts={false}
        onDateChange={jest.fn()}
        onToggleSlot={jest.fn()}
        onNewDraft={jest.fn()}
        onAddDraft={jest.fn()}
        onSaveChanges={jest.fn()}
        onCancelEditing={jest.fn()}
        onDeleteDraft={jest.fn()}
        onCheckout={jest.fn()}
      />
    );
  }

  test("renders 14 hourly slot blocks (08:00–22:00)", async () => {
    await renderSlotPicker();
    // 14 slots from 08:00-09:00 to 21:00-22:00
    const slots = screen.getAllByRole("option");
    expect(slots).toHaveLength(14);
    expect(screen.getByText("08:00–09:00")).toBeInTheDocument();
    expect(screen.getByText("21:00–22:00")).toBeInTheDocument();
  });

  test("shows New Draft button in browsing mode", async () => {
    await renderSlotPicker();
    expect(screen.getByRole("button", { name: "New Draft" })).toBeInTheDocument();
  });

  test("does not show Checkout button when no drafts", async () => {
    await renderSlotPicker();
    expect(screen.queryByRole("button", { name: "Checkout" })).not.toBeInTheDocument();
  });

  test("shows Checkout when hasDrafts=true", async () => {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    const today = new Date().toISOString().slice(0, 10);
    renderWithProviders(
      <SlotPicker
        selectedDate={today}
        activeSlots={[]}
        drafts={[]}
        editingDraftId={null}
        activeDraftColor="#7C3AED"
        canAddMoreSlots={true}
        mode="browsing"
        isValidDraft={false}
        hasDrafts={true}
        onDateChange={jest.fn()}
        onToggleSlot={jest.fn()}
        onNewDraft={jest.fn()}
        onAddDraft={jest.fn()}
        onSaveChanges={jest.fn()}
        onCancelEditing={jest.fn()}
        onDeleteDraft={jest.fn()}
        onCheckout={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Checkout" })).toBeInTheDocument();
  });

  test("shows Add Draft and Cancel in creating mode", async () => {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    const today = new Date().toISOString().slice(0, 10);
    renderWithProviders(
      <SlotPicker
        selectedDate={today}
        activeSlots={[]}
        drafts={[]}
        editingDraftId={null}
        activeDraftColor="#7C3AED"
        canAddMoreSlots={true}
        mode="creating"
        isValidDraft={false}
        hasDrafts={false}
        onDateChange={jest.fn()}
        onToggleSlot={jest.fn()}
        onNewDraft={jest.fn()}
        onAddDraft={jest.fn()}
        onSaveChanges={jest.fn()}
        onCancelEditing={jest.fn()}
        onDeleteDraft={jest.fn()}
        onCheckout={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Add Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  test("Add Draft is disabled when isValidDraft=false", async () => {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    const today = new Date().toISOString().slice(0, 10);
    renderWithProviders(
      <SlotPicker
        selectedDate={today}
        activeSlots={[]}
        drafts={[]}
        editingDraftId={null}
        activeDraftColor="#7C3AED"
        canAddMoreSlots={true}
        mode="creating"
        isValidDraft={false}
        hasDrafts={false}
        onDateChange={jest.fn()}
        onToggleSlot={jest.fn()}
        onNewDraft={jest.fn()}
        onAddDraft={jest.fn()}
        onSaveChanges={jest.fn()}
        onCancelEditing={jest.fn()}
        onDeleteDraft={jest.fn()}
        onCheckout={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Add Draft" })).toBeDisabled();
  });

  test("shows Save Changes, Cancel, Delete Draft in editing mode", async () => {
    const { default: SlotPicker } = await import("@/components/Floorplan/SlotPicker");
    const today = new Date().toISOString().slice(0, 10);
    renderWithProviders(
      <SlotPicker
        selectedDate={today}
        activeSlots={[9]}
        drafts={[]}
        editingDraftId="d1"
        activeDraftColor="#7C3AED"
        canAddMoreSlots={true}
        mode="editing"
        isValidDraft={true}
        hasDrafts={true}
        onDateChange={jest.fn()}
        onToggleSlot={jest.fn()}
        onNewDraft={jest.fn()}
        onAddDraft={jest.fn()}
        onSaveChanges={jest.fn()}
        onCancelEditing={jest.fn()}
        onDeleteDraft={jest.fn()}
        onCheckout={jest.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Draft" })).toBeInTheDocument();
  });
});

// ─── BookingDraftsPanel component tests ──────────────────────────────────────

describe("BookingDraftsPanel", () => {
  async function renderPanel(
    drafts = [] as Parameters<typeof import("@/components/Floorplan/BookingDraftsPanel")["default"]>[0]["drafts"],
    mode = "browsing" as Parameters<typeof import("@/components/Floorplan/BookingDraftsPanel")["default"]>[0]["mode"]
  ) {
    const { default: BookingDraftsPanel } = await import(
      "@/components/Floorplan/BookingDraftsPanel"
    );
    renderWithProviders(
      <BookingDraftsPanel
        drafts={drafts}
        editingDraftId={null}
        mode={mode}
        onEditDraft={jest.fn()}
        onDeleteDraft={jest.fn()}
      />
    );
  }

  test("shows empty state when no drafts", async () => {
    await renderPanel();
    expect(screen.getByText(/No drafts yet/i)).toBeInTheDocument();
  });

  test("shows draft card with seat label", async () => {
    await renderPanel([
      {
        id: "d1",
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
        id: "d1",
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
        id: "d1",
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
        id: "d1",
        color: "#7C3AED",
        seatId: "s1",
        seatLabel: "A1",
        slots: [8, 9, 10],
        date: "2026-03-25",
      },
    ]);
    expect(screen.getByText("3h total")).toBeInTheDocument();
  });

  test("shows Edit and Delete in browsing mode", async () => {
    await renderPanel([
      { id: "d1", color: "#7C3AED", seatId: "s1", seatLabel: "A1", slots: [9], date: "2026-03-25" },
    ]);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  test("hides Edit/Delete in creating mode", async () => {
    await renderPanel(
      [{ id: "d1", color: "#7C3AED", seatId: "s1", seatLabel: "A1", slots: [9], date: "2026-03-25" }],
      "creating"
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

  test("renders three-column layout: slot picker, seat map, drafts panel", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => {
      expect(screen.getByText("New Draft")).toBeInTheDocument();
      expect(screen.getByText(/Booking Drafts/i)).toBeInTheDocument();
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

  test("browsing state loads with a default slot and triggers availability query", async () => {
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

  test("New Draft button switches to creating mode", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));
    fireEvent.click(screen.getByText("New Draft"));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Draft" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });
  });

  test("Add Draft is disabled until slot and seat are selected", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));
    fireEvent.click(screen.getByText("New Draft"));
    await waitFor(() => screen.getByRole("button", { name: "Add Draft" }));
    expect(screen.getByRole("button", { name: "Add Draft" })).toBeDisabled();
  });

  test("Cancel in creating mode returns to browsing", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));
    fireEvent.click(screen.getByText("New Draft"));
    await waitFor(() => screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "New Draft" })).toBeInTheDocument();
    });
  });

  test("Checkout button not shown when no drafts", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));
    expect(screen.queryByRole("button", { name: "Checkout" })).not.toBeInTheDocument();
  });

  /** Helper: enter creating mode, pick slot 09:00, assign seat A1, submit draft. */
  async function addOneDraft() {
    fireEvent.click(screen.getByText("New Draft"));
    // Wait for creating mode (Add Draft button renders only in creating mode)
    await waitFor(() => screen.getByRole("button", { name: "Add Draft" }));

    // Click the 09:00–10:00 slot (index 1 in the 14-slot list starting at 08:00)
    fireEvent.click(screen.getAllByRole("option")[1]);

    // Set seat directly — SVG click not available in JSDOM
    // Call via act so React flushes the update before we continue
    await act(async () => {
      useBookingStore.getState().setActiveSeat("s1", "A1");
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add Draft" })).not.toBeDisabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Draft" }));
  }

  test("draft appears in panel after add", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));

    await addOneDraft();

    await waitFor(() => {
      // "Seat A1" is unique to the drafts panel (slot label in SlotPicker doesn't say "Seat …")
      expect(screen.getByText("Seat A1")).toBeInTheDocument();
      // "1h total" only appears in BookingDraftsPanel
      expect(screen.getByText("1h total")).toBeInTheDocument();
    });
  });

  test("Checkout button appears after draft is added", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));

    await addOneDraft();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Checkout" })).toBeInTheDocument();
    });
  });

  test("Checkout opens the confirm modal", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));

    await addOneDraft();

    await waitFor(() => screen.getByRole("button", { name: "Checkout" }));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  test("discrete slot selections trigger separate availability queries", async () => {
    setupApiMocks();
    await renderFloorplan();
    await waitFor(() => screen.getByText("New Draft"));

    fireEvent.click(screen.getByText("New Draft"));
    await waitFor(() => screen.getByRole("button", { name: "Add Draft" }));

    fireEvent.click(screen.getAllByRole("option")[0]); // 08:00–09:00
    fireEvent.click(screen.getAllByRole("option")[2]); // 10:00–11:00

    await waitFor(() => {
      const availabilityCalls = mockApi.get.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes("/api/v1/spaces/sp1/availability"));
      expect(availabilityCalls.some((url) => url.includes("08%3A00%3A00"))).toBe(true);
      expect(availabilityCalls.some((url) => url.includes("10%3A00%3A00"))).toBe(true);
    });
  });
});
