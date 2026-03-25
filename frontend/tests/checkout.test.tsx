/**
 * Checkout flow tests: slotRanges utility, bookingStore checkoutResults,
 * ConfirmPage, and ResultPage.
 */
import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";
import { useBookingStore } from "@/store/bookingStore";
import { slotRanges } from "@/app/(dashboard)/confirm/page";

// ─── API mock ─────────────────────────────────────────────────────────────────
// jest.mock is hoisted before const declarations; use jest.requireMock to get
// references after the fact.

jest.mock("@/lib/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
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

const mockApi = (jest.requireMock("@/lib/api") as { api: Record<string, jest.Mock> }).api;

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { name: "Alice", role: "user" },
    logout: jest.fn(),
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeDraft(overrides: Partial<{
  id: string;
  color: string;
  seatId: string;
  seatLabel: string;
  slots: number[];
  date: string;
}> = {}) {
  return {
    id: "d1",
    color: "#7C3AED",
    seatId: "s1",
    seatLabel: "A1",
    slots: [9, 10],
    date: "2026-04-01",
    ...overrides,
  };
}

// ─── slotRanges unit tests ────────────────────────────────────────────────────

describe("slotRanges", () => {
  test("empty slots returns empty array", () => {
    expect(slotRanges([])).toEqual([]);
  });

  test("single slot returns one range", () => {
    expect(slotRanges([9])).toEqual([{ start: 9, end: 10 }]);
  });

  test("two contiguous slots merge into one range", () => {
    expect(slotRanges([9, 10])).toEqual([{ start: 9, end: 11 }]);
  });

  test("three contiguous slots merge into one range", () => {
    expect(slotRanges([8, 9, 10])).toEqual([{ start: 8, end: 11 }]);
  });

  test("non-contiguous slots produce separate ranges", () => {
    expect(slotRanges([8, 10])).toEqual([
      { start: 8, end: 9 },
      { start: 10, end: 11 },
    ]);
  });

  test("unsorted input is handled correctly", () => {
    expect(slotRanges([12, 8, 9])).toEqual([
      { start: 8, end: 10 },
      { start: 12, end: 13 },
    ]);
  });

  test("three groups with gaps", () => {
    expect(slotRanges([8, 9, 11, 14])).toEqual([
      { start: 8, end: 10 },
      { start: 11, end: 12 },
      { start: 14, end: 15 },
    ]);
  });
});

// ─── bookingStore checkoutResults tests ──────────────────────────────────────

describe("bookingStore — checkoutResults", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
  });

  test("initial checkoutResults is null", () => {
    expect(useBookingStore.getState().checkoutResults).toBeNull();
  });

  test("setCheckoutResults stores results and clears drafts", () => {
    // Set up a draft first
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.toggleSlot(9);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    expect(useBookingStore.getState().drafts).toHaveLength(1);

    const results = [
      {
        draftId: "d1",
        draftColor: "#7C3AED",
        seatLabel: "A1",
        start: "2026-04-01T09:00:00",
        end: "2026-04-01T10:00:00",
        bookingId: "booking-123",
        status: "success" as const,
        errorMessage: null,
      },
    ];

    act(() => {
      useBookingStore.getState().setCheckoutResults(results);
    });

    expect(useBookingStore.getState().checkoutResults).toEqual(results);
    expect(useBookingStore.getState().drafts).toHaveLength(0);
  });

  test("reset clears checkoutResults", () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([]);
    });
    expect(useBookingStore.getState().checkoutResults).toEqual([]);

    act(() => {
      useBookingStore.getState().reset();
    });
    expect(useBookingStore.getState().checkoutResults).toBeNull();
  });
});

// ─── ConfirmPage tests ────────────────────────────────────────────────────────

describe("ConfirmPage", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    mockApi.post.mockReset();
    jest.clearAllMocks();
  });

  async function loadConfirmPage() {
    const { default: ConfirmPage } = await import(
      "@/app/(dashboard)/confirm/page"
    );
    return ConfirmPage;
  }

  test("shows empty state when no drafts exist", async () => {
    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);
    expect(screen.getByText("No drafts to confirm")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Spaces" })).toBeInTheDocument();
  });

  test("shows draft preview with seat label and date", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.toggleSlot(10);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    expect(screen.getByText("Seat A1")).toBeInTheDocument();
    expect(screen.getByText("2026-04-01")).toBeInTheDocument();
    // Contiguous 9+10 = one range 09:00-11:00
    expect(screen.getByText("09:00–11:00")).toBeInTheDocument();
  });

  test("shows gap warning when draft has non-contiguous slots", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(8);
      store.toggleSlot(10); // gap at 9
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    expect(screen.getByText(/2 separate bookings/)).toBeInTheDocument();
  });

  test("does not show gap warning for contiguous slots", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.toggleSlot(10);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    expect(screen.queryByText(/separate bookings/)).not.toBeInTheDocument();
  });

  test("confirm button shows booking count", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);
    expect(screen.getByRole("button", { name: "Confirm Booking" })).toBeInTheDocument();
  });

  test("submits booking via API and navigates to /result on success", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    mockApi.post.mockResolvedValueOnce({ id: "booking-abc" });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/bookings", {
        seat_id: "s1",
        start_time: "2026-04-01T09:00:00",
        end_time: "2026-04-01T10:00:00",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/result");
    });
  });

  test("stores success result in bookingStore after submission", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    mockApi.post.mockResolvedValueOnce({ id: "booking-xyz" });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
    });

    await waitFor(() => {
      const results = useBookingStore.getState().checkoutResults;
      expect(results).toHaveLength(1);
      expect(results![0].status).toBe("success");
      expect(results![0].bookingId).toBe("booking-xyz");
    });
  });

  test("stores error result when API call fails", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(9);
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    mockApi.post.mockRejectedValueOnce(new Error("Conflict"));

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Booking" }));
    });

    await waitFor(() => {
      const results = useBookingStore.getState().checkoutResults;
      expect(results).toHaveLength(1);
      expect(results![0].status).toBe("error");
      expect(results![0].errorMessage).toBe("Conflict");
    });
  });

  test("gap in draft creates two API calls", async () => {
    act(() => {
      const store = useBookingStore.getState();
      store.enterCreating();
      store.setDate("2026-04-01");
      store.toggleSlot(8);
      store.toggleSlot(10); // gap at 9
      store.setActiveSeat("s1", "A1");
      store.addDraft();
    });

    mockApi.post
      .mockResolvedValueOnce({ id: "b1" })
      .mockResolvedValueOnce({ id: "b2" });

    const ConfirmPage = await loadConfirmPage();
    renderWithProviders(<ConfirmPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm Bookings" }));
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledTimes(2);
      const results = useBookingStore.getState().checkoutResults;
      expect(results).toHaveLength(2);
    });
  });
});

// ─── ResultPage tests ─────────────────────────────────────────────────────────

describe("ResultPage", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    jest.clearAllMocks();
  });

  async function loadResultPage() {
    const { default: ResultPage } = await import(
      "@/app/(dashboard)/result/page"
    );
    return ResultPage;
  }

  test("shows empty state when no checkout results", async () => {
    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);
    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
  });

  test("shows all success banner", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: "booking-1",
          status: "success",
          errorMessage: null,
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);
    expect(screen.getByText("All bookings confirmed!")).toBeInTheDocument();
    expect(screen.getByText(/1 booking successfully created/)).toBeInTheDocument();
  });

  test("shows all failed banner", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: null,
          status: "error",
          errorMessage: "Conflict",
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);
    expect(screen.getByText("Bookings failed")).toBeInTheDocument();
    expect(screen.getByText(/All 1 booking could not be created/)).toBeInTheDocument();
  });

  test("shows partial success banner", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: "b1",
          status: "success",
          errorMessage: null,
        },
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T11:00:00",
          end: "2026-04-01T12:00:00",
          bookingId: null,
          status: "error",
          errorMessage: "Conflict",
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);
    expect(screen.getByText("Partially confirmed")).toBeInTheDocument();
    expect(screen.getByText(/1 succeeded, 1 failed/)).toBeInTheDocument();
  });

  test("shows per-booking result rows", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "B2",
          start: "2026-04-01T14:00:00",
          end: "2026-04-01T15:00:00",
          bookingId: null,
          status: "error",
          errorMessage: "Seat not available",
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);
    expect(screen.getByText("Seat B2")).toBeInTheDocument();
    expect(screen.getByText("Seat not available")).toBeInTheDocument();
    expect(screen.getByText(/14:00–15:00/)).toBeInTheDocument();
  });

  test("View My Bookings resets store and navigates to /bookings", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: "b1",
          status: "success",
          errorMessage: null,
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);

    fireEvent.click(screen.getByRole("button", { name: "View My Bookings" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/bookings");
    expect(useBookingStore.getState().checkoutResults).toBeNull();
  });

  test("Book Another Space button is present and resets on click", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: null,
          status: "error",
          errorMessage: "Failed",
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);

    fireEvent.click(screen.getByRole("button", { name: "Book Another Space" }));

    expect(mockRouter.push).toHaveBeenCalledWith("/buildings");
    expect(useBookingStore.getState().checkoutResults).toBeNull();
  });

  test("View My Bookings is hidden when all bookings failed", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          draftId: "d1",
          draftColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: null,
          status: "error",
          errorMessage: "Failed",
        },
      ]);
    });

    const ResultPage = await loadResultPage();
    renderWithProviders(<ResultPage />);

    expect(screen.queryByRole("button", { name: "View My Bookings" })).not.toBeInTheDocument();
  });
});
