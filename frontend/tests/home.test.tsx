/**
 * Home page tests: layout, sections, auth states, and data wiring.
 */
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { useLocationStore } from "@/store/locationStore";

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

let mockAuthState = {
  isAuthenticated: true,
  user: { name: "Alice", role: "user" },
  logout: jest.fn(),
};

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => mockAuthState,
}));

/** Reset location store to idle before each test. */
function resetLocation() {
  useLocationStore.setState({
    permission: "idle",
    coordinates: null,
    acquiredAt: null,
    requestLocation: jest.fn(),
    clearLocation: jest.fn(),
  });
}

/** Resolved mock for api.get that handles all expected URLs. */
function mockApiResolved({
  spaces = [],
  buildings = [],
  bookings = [],
}: {
  spaces?: object[];
  buildings?: object[];
  bookings?: object[];
} = {}) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes("/bookings")) return Promise.resolve(bookings);
    if (url.includes("/buildings")) return Promise.resolve(buildings);
    return Promise.resolve(spaces);
  });
}

// ─── HomePage — authenticated ─────────────────────────────────────────────────

describe("HomePage — authenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocation();
    mockAuthState = { isAuthenticated: true, user: { name: "Alice", role: "user" }, logout: jest.fn() };
  });

  async function renderHome() {
    const { default: HomePage } = await import("@/app/(public)/page");
    renderWithProviders(<HomePage />);
  }

  test("renders search input", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByPlaceholderText("Search for a building or space…")).toBeInTheDocument();
  });

  test("renders For You section heading", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByText("For You")).toBeInTheDocument();
  });

  test("renders See all link to /my-spaces", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    const link = screen.getAllByRole("link").find((l) => l.getAttribute("href") === "/my-spaces");
    expect(link).toBeTruthy();
  });

  test("renders Recent Spaces section heading", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByText("Recent Spaces")).toBeInTheDocument();
  });

  test("renders Nearby Buildings section heading", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByText("Nearby Buildings")).toBeInTheDocument();
  });

  test("shows loading skeletons while data is loading", async () => {
    // All queries pending — For You section shows 4 skeletons, Recent Spaces shows 4.
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  test("renders space cards in Recent Spaces after load", async () => {
    mockApiResolved({
      spaces: [
        { id: "s1", name: "Library A", type: "library", capacity: 20, building_id: null, description: null, layout_config: null, created_at: "" },
        { id: "s2", name: "Office B", type: "office", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "" },
      ],
    });
    await renderHome();
    await waitFor(() => {
      expect(screen.getByText("Library A")).toBeInTheDocument();
      expect(screen.getByText("Office B")).toBeInTheDocument();
    });
  });

  test("shows empty message when no spaces returned", async () => {
    mockApiResolved();
    await renderHome();
    await waitFor(() => {
      expect(screen.getByText("No spaces found.")).toBeInTheDocument();
    });
  });

  test("renders placeholder nearby building cards", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByText("Central Library")).toBeInTheDocument();
    expect(screen.getByText("Tech Hub")).toBeInTheDocument();
  });

  test("nearby building cards link to /buildings", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    const buildingLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/buildings");
    expect(buildingLinks.length).toBeGreaterThan(0);
  });

  test("For You shows location nudge when permission is idle", async () => {
    mockApiResolved();
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText("Allow location access to see nearby spaces")).toBeInTheDocument()
    );
  });

  test("For You shows recent booking card in mixed stream", async () => {
    mockApiResolved({
      bookings: [
        {
          id: "bk1",
          space_id: "s1",
          space_name: "My Library",
          space_type: "library",
          building_name: "CBD Building",
          seat_id: "seat1",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          status: "confirmed",
          user_id: "u1",
          checked_in_at: null,
          created_at: new Date().toISOString(),
          seat_label: "A1",
          seat_position: { x: 0, y: 0 },
          space_layout_config: null,
          building_id: "b1",
        },
      ],
    });
    await renderHome();
    await waitFor(() => expect(screen.getByText("My Library")).toBeInTheDocument());
    expect(screen.getByText("Booked recently")).toBeInTheDocument();
  });

  test("For You shows recommendation cards when location granted", async () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApiResolved({
      spaces: [
        {
          space_id: "rec1",
          space_name: "CBD Library",
          space_type: "library",
          capacity: 20,
          building_id: "b1",
          building_name: "CBD Building",
          building_address: "1 CBD St",
          building_latitude: -33.8688,
          building_longitude: 151.2093,
          distance_km: 0.1,
          reason: "near_you",
          available_seat_count: 5,
        },
      ],
    });
    await renderHome();
    await waitFor(() => expect(screen.getByText("CBD Library")).toBeInTheDocument());
    expect(screen.getByText("Near you")).toBeInTheDocument();
  });
});

// ─── HomePage — unauthenticated ───────────────────────────────────────────────

describe("HomePage — unauthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocation();
    mockAuthState = { isAuthenticated: false, user: null as never, logout: jest.fn() };
  });

  async function renderHome() {
    const { default: HomePage } = await import("@/app/(public)/page");
    renderWithProviders(<HomePage />);
  }

  test("shows sign-in prompt instead of loading spaces", async () => {
    await renderHome();
    expect(screen.getByText("Sign in to see your recently used spaces")).toBeInTheDocument();
  });

  test("does not show For You section when unauthenticated", async () => {
    await renderHome();
    expect(screen.queryByText("For You")).not.toBeInTheDocument();
  });

  test("does not show loading skeletons when unauthenticated", async () => {
    await renderHome();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(0);
  });

  test("sign-in prompt links to /login", async () => {
    await renderHome();
    const loginLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/login");
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  test("still renders Nearby Buildings section", async () => {
    await renderHome();
    expect(screen.getByText("Nearby Buildings")).toBeInTheDocument();
    expect(screen.getByText("Central Library")).toBeInTheDocument();
  });
});
