/**
 * P1 Bookings page tests.
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

const CONFIRMED_BOOKING = {
  id: "b1",
  user_id: "u1",
  seat_id: "seat1",
  start_time: "2026-03-20T09:00:00Z",
  end_time: "2026-03-20T10:00:00Z",
  status: "confirmed",
  checked_in_at: null,
  created_at: "2026-03-19T08:00:00Z",
};

const EXPIRED_BOOKING = {
  ...CONFIRMED_BOOKING,
  id: "b2",
  status: "expired",
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

  test("shows loading state initially", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderBookings();
    expect(screen.getByText("Loading bookings…")).toBeInTheDocument();
  });

  test("shows empty message when no bookings", async () => {
    mockApi.get.mockResolvedValue([]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByText(/No bookings yet/i)).toBeInTheDocument();
    });
  });

  test("confirmed booking shows Check In and Cancel buttons", async () => {
    mockApi.get.mockResolvedValue([CONFIRMED_BOOKING]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /check in/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });
  });

  test("non-confirmed booking shows no action buttons", async () => {
    mockApi.get.mockResolvedValue([EXPIRED_BOOKING]);
    await renderBookings();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /check in/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  test("cancel button calls PATCH cancel endpoint", async () => {
    mockApi.get.mockResolvedValue([CONFIRMED_BOOKING]);
    mockApi.patch.mockResolvedValue({ ...CONFIRMED_BOOKING, status: "cancelled" });

    await renderBookings();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith("/api/v1/bookings/b1/cancel");
    });
  });

  test("check in button calls PATCH check-in endpoint", async () => {
    mockApi.get.mockResolvedValue([CONFIRMED_BOOKING]);
    mockApi.patch.mockResolvedValue({ ...CONFIRMED_BOOKING, status: "checked_in" });

    await renderBookings();
    await waitFor(() => screen.getByRole("button", { name: /check in/i }));

    fireEvent.click(screen.getByRole("button", { name: /check in/i }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith("/api/v1/bookings/b1/check-in");
    });
  });
});
