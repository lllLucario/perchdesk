/**
 * Checkout flow tests: slotRanges utility, bookingStore checkoutResults,
 * ConfirmModal, and ResultPage.
 */
import React from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";
import { useBookingStore } from "@/store/bookingStore";
import { slotRanges } from "@/lib/booking";

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

  test("setCheckoutResults stores results and clears bookings", () => {
    act(() => {
      const store = useBookingStore.getState();
      useBookingStore.setState({ activeSlots: [9] });
      store.setActiveSeat("s1", "A1");
      store.addBooking();
    });

    expect(useBookingStore.getState().bookings).toHaveLength(1);

    const results = [
      {
        planId: "b1",
        planColor: "#7C3AED",
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
    expect(useBookingStore.getState().bookings).toHaveLength(0);
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

// ─── ConfirmModal tests ───────────────────────────────────────────────────────

describe("ConfirmModal", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    mockApi.post.mockReset();
    jest.clearAllMocks();
  });

  async function loadConfirmModal() {
    const { default: ConfirmModal } = await import(
      "@/components/Floorplan/ConfirmModal"
    );
    return ConfirmModal;
  }

  const singleBooking = {
    id: "b1",
    color: "#7C3AED",
    seatId: "s1",
    seatLabel: "A1",
    slots: [9, 10],
    date: "2026-04-01",
  };

  const gappedBooking = {
    id: "b2",
    color: "#D97706",
    seatId: "s2",
    seatLabel: "B2",
    slots: [8, 10], // gap at 9
    date: "2026-04-01",
  };

  test("renders seat label and slot range for a booking", async () => {
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );
    expect(screen.getByText("Seat A1")).toBeInTheDocument();
    // [9, 10] → contiguous → 09:00–11:00
    expect(screen.getByText("09:00–11:00")).toBeInTheDocument();
    expect(screen.getByText(/Will create 1 booking/)).toBeInTheDocument();
  });

  test("shows plural heading for multiple bookings", async () => {
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[gappedBooking]} onClose={jest.fn()} />
    );
    // [8, 10] → 2 ranges → heading says "Confirm Bookings"
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Bookings/)).toBeInTheDocument();
  });

  test("shows non-contiguous note for gapped booking", async () => {
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[gappedBooking]} onClose={jest.fn()} />
    );
    expect(screen.getByText(/non-contiguous slots/)).toBeInTheDocument();
    expect(screen.getByText(/Will create 2 bookings/)).toBeInTheDocument();
  });

  test("does not show non-contiguous note for contiguous slots", async () => {
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );
    expect(screen.queryByText(/non-contiguous/)).not.toBeInTheDocument();
  });

  test("Cancel button calls onClose", async () => {
    const onClose = jest.fn();
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(<ConfirmModal bookings={[singleBooking]} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Close (×) button calls onClose", async () => {
    const onClose = jest.fn();
    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(<ConfirmModal bookings={[singleBooking]} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Confirm submits booking via API with correct payload", async () => {
    mockApi.post.mockResolvedValueOnce({ id: "booking-abc" });

    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/bookings", {
        seat_id: "s1",
        start_time: "2026-04-01T09:00:00",
        end_time: "2026-04-01T11:00:00",
      });
    });
  });

  test("navigates to /result after submission", async () => {
    mockApi.post.mockResolvedValueOnce({ id: "booking-abc" });

    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/result");
    });
  });

  test("stores success result in bookingStore after submission", async () => {
    mockApi.post.mockResolvedValueOnce({ id: "booking-xyz" });

    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    await waitFor(() => {
      const results = useBookingStore.getState().checkoutResults;
      expect(results).toHaveLength(1);
      expect(results![0].status).toBe("success");
      expect(results![0].bookingId).toBe("booking-xyz");
    });
  });

  test("stores error result when API call fails", async () => {
    mockApi.post.mockRejectedValueOnce(new Error("Conflict"));

    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[singleBooking]} onClose={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    await waitFor(() => {
      const results = useBookingStore.getState().checkoutResults;
      expect(results).toHaveLength(1);
      expect(results![0].status).toBe("error");
      expect(results![0].errorMessage).toBe("Conflict");
    });
  });

  test("gapped booking creates two API calls", async () => {
    mockApi.post
      .mockResolvedValueOnce({ id: "b1" })
      .mockResolvedValueOnce({ id: "b2" });

    const ConfirmModal = await loadConfirmModal();
    renderWithProviders(
      <ConfirmModal bookings={[gappedBooking]} onClose={jest.fn()} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledTimes(2);
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/bookings", {
        seat_id: "s2",
        start_time: "2026-04-01T08:00:00",
        end_time: "2026-04-01T09:00:00",
      });
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/bookings", {
        seat_id: "s2",
        start_time: "2026-04-01T10:00:00",
        end_time: "2026-04-01T11:00:00",
      });
    });
  });

  test("floorplan Submit button opens the confirm modal", async () => {
    const mockGet = mockApi.get;
    mockGet.mockImplementation((url: string) => {
      if (url === "/api/v1/spaces/sp1") {
        return Promise.resolve({
          id: "sp1",
          building_id: "b1",
          name: "Central Library",
          type: "library",
          description: null,
          capacity: 4,
          layout_config: { grid_size: 30 },
          created_at: "",
          seats: [
            { id: "s1", space_id: "sp1", label: "A1", position: { x: 60, y: 60 }, status: "available", attributes: null },
          ],
        });
      }
      if (url === "/api/v1/spaces/sp1/rules") {
        return Promise.resolve({
          id: "r1", space_id: "sp1", max_duration_minutes: 240,
          max_advance_days: 3, time_unit: "hourly",
          auto_release_minutes: null, requires_approval: false,
        });
      }
      if (url.includes("/availability")) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    // Seed a booking directly in the store so Submit button is visible
    act(() => {
      useBookingStore.setState({ activeSlots: [9] });
      useBookingStore.getState().setActiveSeat("s1", "A1");
      useBookingStore.getState().addBooking();
    });

    const { default: SpaceFloorplanPage } = await import(
      "@/app/(dashboard)/spaces/[id]/page"
    );
    const { Suspense } = await import("react");

    await act(async () => {
      renderWithProviders(
        <Suspense fallback={<div>loading…</div>}>
          <SpaceFloorplanPage params={Promise.resolve({ id: "sp1" })} />
        </Suspense>
      );
    });

    await waitFor(() => screen.getByRole("button", { name: "Submit" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
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
          planId: "b1",
          planColor: "#7C3AED",
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
          planId: "b1",
          planColor: "#7C3AED",
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
          planId: "b1",
          planColor: "#7C3AED",
          seatLabel: "A1",
          start: "2026-04-01T09:00:00",
          end: "2026-04-01T10:00:00",
          bookingId: "b1",
          status: "success",
          errorMessage: null,
        },
        {
          planId: "b1",
          planColor: "#7C3AED",
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
          planId: "b1",
          planColor: "#7C3AED",
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
          planId: "b1",
          planColor: "#7C3AED",
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

  test("Book Another Space resets store and navigates to /buildings", async () => {
    act(() => {
      useBookingStore.getState().setCheckoutResults([
        {
          planId: "b1",
          planColor: "#7C3AED",
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
          planId: "b1",
          planColor: "#7C3AED",
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

    expect(
      screen.queryByRole("button", { name: "View My Bookings" })
    ).not.toBeInTheDocument();
  });
});
