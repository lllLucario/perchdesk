/**
 * My Bookings page tests.
 *
 * Covers: tab switching, status grouping, action visibility,
 * empty states, and mutation wiring.
 */
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// ─── Shared mock data ─────────────────────────────────────────────────────────

const ENRICHED_BASE = {
  user_id: "u1",
  seat_id: "seat1",
  seat_label: "A1",
  seat_position: { x: 60, y: 60 },
  space_id: "space1",
  space_name: "Test Library",
  space_layout_config: null,
  building_id: null,
  building_name: null,
  created_at: "2026-03-19T08:00:00Z",
  checked_in_at: null,
};

/** start_time in the future → Booked */
const FUTURE_CONFIRMED = {
  ...ENRICHED_BASE,
  id: "b-future",
  start_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
  end_time: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
  status: "confirmed",
};

/** start_time in the past, end_time in the future, confirmed → Check-in Available */
const PAST_CONFIRMED = {
  ...ENRICHED_BASE,
  id: "b-past-confirmed",
  start_time: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
  status: "confirmed",
};

/** checked_in, end_time in the past → Completed */
const COMPLETED = {
  ...ENRICHED_BASE,
  id: "b-completed",
  start_time: "2026-03-15T09:00:00Z",
  end_time: "2026-03-15T11:00:00Z",
  status: "checked_in",
  checked_in_at: "2026-03-15T09:05:00Z",
};

/** expired */
const EXPIRED = {
  ...ENRICHED_BASE,
  id: "b-expired",
  start_time: "2026-03-20T09:00:00Z",
  end_time: "2026-03-20T10:00:00Z",
  status: "expired",
};

/** cancelled */
const CANCELLED = {
  ...ENRICHED_BASE,
  id: "b-cancelled",
  start_time: "2026-03-18T09:00:00Z",
  end_time: "2026-03-18T11:00:00Z",
  status: "cancelled",
};

// ─── BookingsPage ─────────────────────────────────────────────────────────────

describe("BookingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderBookings() {
    const { default: BookingsPage } = await import("@/app/(dashboard)/bookings/page");
    renderWithProviders(<BookingsPage />);
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  test("shows loading state initially", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderBookings();
    expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
  });

  // ── Empty states ─────────────────────────────────────────────────────────

  test("shows active empty state when no bookings", async () => {
    mockApi.get.mockResolvedValue([]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByText(/No active bookings/i)).toBeInTheDocument();
    });
  });

  test("shows history empty state when switching to Booking History tab with no history", async () => {
    mockApi.get.mockResolvedValue([FUTURE_CONFIRMED]); // only active booking
    await renderBookings();
    await waitFor(() => screen.getByText("Active Bookings"));

    fireEvent.click(screen.getByRole("button", { name: /Booking History/i }));

    await waitFor(() => {
      expect(screen.getByText(/No booking history yet/i)).toBeInTheDocument();
    });
  });

  // ── Tab switching ─────────────────────────────────────────────────────────

  test("defaults to Active Bookings tab", async () => {
    mockApi.get.mockResolvedValue([]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Active Bookings/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Booking History/i })).toBeInTheDocument();
    });
  });

  test("can switch to Booking History tab", async () => {
    mockApi.get.mockResolvedValue([EXPIRED]);
    await renderBookings();
    // Wait for loading to finish before interacting
    await waitFor(() => screen.getByRole("button", { name: /Booking History/i }));

    fireEvent.click(screen.getByRole("button", { name: /Booking History/i }));

    await waitFor(() => {
      expect(screen.getByText("Test Library")).toBeInTheDocument();
    });
  });

  // ── Status grouping ───────────────────────────────────────────────────────

  test("active bookings appear in Active tab", async () => {
    mockApi.get.mockResolvedValue([FUTURE_CONFIRMED]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByText("Test Library")).toBeInTheDocument();
    });
  });

  test("history bookings do not appear in Active tab by default", async () => {
    mockApi.get.mockResolvedValue([EXPIRED, COMPLETED, CANCELLED]);
    await renderBookings();
    await waitFor(() => {
      // Active tab shows empty state, not the history cards
      expect(screen.getByText(/No active bookings/i)).toBeInTheDocument();
    });
  });

  test("history bookings appear after switching to History tab", async () => {
    mockApi.get.mockResolvedValue([EXPIRED, COMPLETED, CANCELLED]);
    await renderBookings();
    await waitFor(() => screen.getByText("Booking History"));

    fireEvent.click(screen.getByRole("button", { name: /Booking History/i }));

    await waitFor(() => {
      // All three history bookings render (same space_name)
      expect(screen.getAllByText("Test Library").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Action button visibility ──────────────────────────────────────────────

  test("Booked: shows Cancel only (no Check In)", async () => {
    mockApi.get.mockResolvedValue([FUTURE_CONFIRMED]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
    });
  });

  test("Check-in Available: shows both Check In and Cancel", async () => {
    mockApi.get.mockResolvedValue([PAST_CONFIRMED]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /check in/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  test("history bookings: no Cancel or Check In buttons", async () => {
    mockApi.get.mockResolvedValue([EXPIRED]);
    await renderBookings();
    // Wait for loading to finish before interacting
    await waitFor(() => screen.getByRole("button", { name: /Booking History/i }));

    fireEvent.click(screen.getByRole("button", { name: /Booking History/i }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  // ── Mutation wiring ───────────────────────────────────────────────────────

  test("Cancel button calls PATCH cancel endpoint", async () => {
    mockApi.get.mockResolvedValue([FUTURE_CONFIRMED]);
    mockApi.patch.mockResolvedValue({ ...FUTURE_CONFIRMED, status: "cancelled" });

    await renderBookings();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/bookings/${FUTURE_CONFIRMED.id}/cancel`);
    });
  });

  test("Check In button calls PATCH check-in endpoint", async () => {
    mockApi.get.mockResolvedValue([PAST_CONFIRMED]);
    mockApi.patch.mockResolvedValue({ ...PAST_CONFIRMED, status: "checked_in" });

    await renderBookings();
    await waitFor(() => screen.getByRole("button", { name: /check in/i }));

    fireEvent.click(screen.getByRole("button", { name: /check in/i }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(`/api/v1/bookings/${PAST_CONFIRMED.id}/check-in`);
    });
  });
});

// ─── bookingStatus utilities ─────────────────────────────────────────────────

describe("bookingStatus utilities", () => {
  const { deriveUXStatus, getBookingTab, formatDuration } = require("@/lib/bookingStatus");

  const BASE = {
    ...ENRICHED_BASE,
    id: "x",
    created_at: "2026-01-01T00:00:00Z",
  };

  describe("deriveUXStatus", () => {
    const now = new Date("2026-03-27T10:00:00Z");

    test("confirmed + start in future → Booked", () => {
      const b = { ...BASE, status: "confirmed", start_time: "2026-03-28T09:00:00Z", end_time: "2026-03-28T10:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Booked");
    });

    test("confirmed + start in past, end in future → Check-in Available", () => {
      const b = { ...BASE, status: "confirmed", start_time: "2026-03-27T09:00:00Z", end_time: "2026-03-27T11:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Check-in Available");
    });

    test("confirmed + start and end both in past → Completed", () => {
      const b = { ...BASE, status: "confirmed", start_time: "2026-03-27T07:00:00Z", end_time: "2026-03-27T09:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Completed");
    });

    test("checked_in + end in future → In Use", () => {
      const b = { ...BASE, status: "checked_in", start_time: "2026-03-27T09:00:00Z", end_time: "2026-03-27T11:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("In Use");
    });

    test("checked_in + end in past → Completed", () => {
      const b = { ...BASE, status: "checked_in", start_time: "2026-03-20T09:00:00Z", end_time: "2026-03-20T11:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Completed");
    });

    test("cancelled → Cancelled", () => {
      const b = { ...BASE, status: "cancelled", start_time: "2026-03-20T09:00:00Z", end_time: "2026-03-20T10:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Cancelled");
    });

    test("expired → Expired", () => {
      const b = { ...BASE, status: "expired", start_time: "2026-03-20T09:00:00Z", end_time: "2026-03-20T10:00:00Z" };
      expect(deriveUXStatus(b, now)).toBe("Expired");
    });
  });

  describe("getBookingTab", () => {
    test("Booked → active", () => expect(getBookingTab("Booked")).toBe("active"));
    test("Check-in Available → active", () => expect(getBookingTab("Check-in Available")).toBe("active"));
    test("In Use → active", () => expect(getBookingTab("In Use")).toBe("active"));
    test("Completed → history", () => expect(getBookingTab("Completed")).toBe("history"));
    test("Cancelled → history", () => expect(getBookingTab("Cancelled")).toBe("history"));
    test("Expired → history", () => expect(getBookingTab("Expired")).toBe("history"));
  });

  describe("formatDuration", () => {
    test("exact hours", () => expect(formatDuration("2026-01-01T09:00:00Z", "2026-01-01T11:00:00Z")).toBe("2h"));
    test("hours and minutes", () => expect(formatDuration("2026-01-01T09:00:00Z", "2026-01-01T10:30:00Z")).toBe("1h 30m"));
    test("minutes only", () => expect(formatDuration("2026-01-01T09:00:00Z", "2026-01-01T09:45:00Z")).toBe("45m"));
  });
});
