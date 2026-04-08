/**
 * Home page tests: layout, sections, auth states, and data wiring.
 */
import React from "react";
import { screen, waitFor, fireEvent, within } from "@testing-library/react";
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
  favoriteSpaces = [],
  recentVisits = [],
}: {
  spaces?: object[];
  buildings?: object[];
  bookings?: object[];
  favoriteSpaces?: object[];
  recentVisits?: object[];
} = {}) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes("/bookings")) return Promise.resolve(bookings);
    if (url.includes("/buildings")) return Promise.resolve(buildings);
    if (url.includes("/me/favorite-spaces")) return Promise.resolve(favoriteSpaces);
    if (url.includes("/me/recent-spaces")) return Promise.resolve(recentVisits);
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

  test("renders Buildings section heading when location is idle", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    // Permission is "idle" by default — heading is "Buildings" not "Nearby Buildings"
    expect(screen.getByText("Buildings")).toBeInTheDocument();
  });

  test("renders Nearby Buildings section heading when location is granted", async () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.87, longitude: 151.21, accuracy: 10 },
      acquiredAt: null,
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(screen.getByText("Nearby Buildings")).toBeInTheDocument();
  });

  test("shows error fallback when location is granted but nearby buildings API fails", async () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.87, longitude: 151.21, accuracy: 10 },
      acquiredAt: null,
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApi.get.mockRejectedValue(new Error("Network error"));
    await renderHome();
    await waitFor(() => {
      expect(screen.getByText(/Could not load nearby buildings/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Browse all buildings" })).toBeInTheDocument();
    });
    // Placeholder cards must not appear when the query has failed
    expect(screen.queryByText("Central Library")).not.toBeInTheDocument();
    expect(screen.queryByText("Tech Hub")).not.toBeInTheDocument();
  });

  test("shows loading skeletons while data is loading", async () => {
    // All queries pending — For You section shows 4 skeletons, Recent Spaces shows 4.
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  test("For You shows skeletons when favorites/spaces still loading", async () => {
    // Simulate staggered loading: bookings resolve immediately but
    // favorites and spaces are still pending. The section must show
    // skeletons, not the empty "No personalised spaces yet." fallback.
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes("/bookings")) return Promise.resolve([]);
      // spaces, favorites, and visits stay pending
      return new Promise(() => {});
    });
    await renderHome();
    // Should still be in loading state, showing skeletons
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
    // Must NOT show the empty fallback
    expect(screen.queryByText("No personalised spaces yet.")).not.toBeInTheDocument();
  });

  test("renders space cards in Recent Spaces from bookings and visits", async () => {
    mockApiResolved({
      spaces: [
        { id: "s1", name: "Library A", type: "library", capacity: 20, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
        { id: "s2", name: "Office B", type: "office", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
      ],
      bookings: [
        {
          id: "bk1", space_id: "s1", space_name: "Library A", space_type: "library",
          building_name: null, seat_id: "seat1", start_time: new Date().toISOString(),
          end_time: new Date().toISOString(), status: "confirmed", user_id: "u1",
          checked_in_at: null, created_at: new Date().toISOString(), seat_label: "A1",
          seat_position: { x: 0, y: 0 }, space_layout_config: null, building_id: null,
        },
      ],
      recentVisits: [
        { id: "rv1", user_id: "u1", space_id: "s2", visited_at: new Date().toISOString() },
      ],
    });
    await renderHome();
    await waitFor(() => {
      expect(screen.getAllByText("Library A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Office B").length).toBeGreaterThan(0);
    });
  });

  test("shows empty message when no recent activity", async () => {
    mockApiResolved();
    await renderHome();
    await waitFor(() => {
      expect(screen.getByText(/No recent activity yet/)).toBeInTheDocument();
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
      spaces: [
        { id: "s1", name: "My Library", type: "library", capacity: 20, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
      ],
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
    await waitFor(() => expect(screen.getAllByText("My Library").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Booked recently").length).toBeGreaterThan(0);
  });

  test("For You orders recent cards by created_at DESC, not start_time", async () => {
    // bk1 has an earlier created_at but a later start_time.
    // bk2 has a later created_at but an earlier start_time.
    // The card for Space B (bk2) should appear before Space A (bk1).
    const now = Date.now();
    mockApiResolved({
      spaces: [
        { id: "sA", name: "Space A", type: "library", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
        { id: "sB", name: "Space B", type: "library", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
      ],
      bookings: [
        {
          id: "bk1",
          space_id: "sA",
          space_name: "Space A",
          space_type: "library",
          building_name: "Building X",
          seat_id: "seat1",
          start_time: new Date(now + 7 * 24 * 3600 * 1000).toISOString(),
          end_time: new Date(now + 7 * 24 * 3600 * 1000 + 3600000).toISOString(),
          status: "confirmed",
          user_id: "u1",
          checked_in_at: null,
          created_at: new Date(now - 2000).toISOString(),
          seat_label: "A1",
          seat_position: { x: 0, y: 0 },
          space_layout_config: null,
          building_id: "b1",
        },
        {
          id: "bk2",
          space_id: "sB",
          space_name: "Space B",
          space_type: "library",
          building_name: "Building X",
          seat_id: "seat2",
          start_time: new Date(now + 3600 * 1000).toISOString(),
          end_time: new Date(now + 7200 * 1000).toISOString(),
          status: "confirmed",
          user_id: "u1",
          checked_in_at: null,
          created_at: new Date(now - 1000).toISOString(),
          seat_label: "B1",
          seat_position: { x: 0, y: 0 },
          space_layout_config: null,
          building_id: "b1",
        },
      ],
    });
    await renderHome();
    await waitFor(() => {
      expect(screen.getAllByText("Space A").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Space B").length).toBeGreaterThan(0);
    });
    // Scope to the For You horizontal scroll container (.flex-shrink-0 cards)
    const cards = document.querySelectorAll(".flex-shrink-0");
    const texts = Array.from(cards).map((c) => c.textContent ?? "");
    const indexA = texts.findIndex((t) => t.includes("Space A"));
    const indexB = texts.findIndex((t) => t.includes("Space B"));
    // Space B (more recently booked) must appear before Space A
    expect(indexB).toBeLessThan(indexA);
  });

  test("For You shows error message when nearby API fails", async () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes("nearby")) return Promise.reject(new Error("Network error"));
      return Promise.resolve([]);
    });
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Could not load nearby spaces/)).toBeInTheDocument()
    );
  });

  test("For You shows location fallback when permission is denied", async () => {
    useLocationStore.setState({
      permission: "denied",
      coordinates: null,
      acquiredAt: null,
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApiResolved();
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Location unavailable/)).toBeInTheDocument()
    );
    const link = screen.getByRole("link", { name: "Browse buildings" });
    expect(link).toHaveAttribute("href", "/buildings");
  });

  test("For You shows location fallback when permission is unavailable", async () => {
    useLocationStore.setState({
      permission: "unavailable",
      coordinates: null,
      acquiredAt: null,
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApiResolved();
    await renderHome();
    await waitFor(() =>
      expect(screen.getByText(/Location unavailable/)).toBeInTheDocument()
    );
  });

  test("For You shows favorite spaces in mixed stream", async () => {
    mockApiResolved({
      spaces: [
        { id: "fav1", name: "Fav Library", type: "library", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: true },
      ],
      favoriteSpaces: [
        { id: "f1", user_id: "u1", space_id: "fav1", created_at: new Date().toISOString() },
      ],
    });
    await renderHome();
    await waitFor(() => expect(screen.getAllByText("Fav Library").length).toBeGreaterThan(0));
    expect(screen.getByText("Favorite")).toBeInTheDocument();
  });

  test("For You shows visited-recently spaces in mixed stream", async () => {
    mockApiResolved({
      spaces: [
        { id: "v1", name: "Visited Space", type: "office", capacity: 5, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: false },
      ],
      recentVisits: [
        { id: "rv1", user_id: "u1", space_id: "v1", visited_at: new Date().toISOString() },
      ],
    });
    await renderHome();
    await waitFor(() => expect(screen.getAllByText("Visited Space").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Visited recently").length).toBeGreaterThan(0);
  });

  test("For You deduplicates spaces across sources", async () => {
    // Same space is both favorited and recently booked — should appear only once
    mockApiResolved({
      spaces: [
        { id: "dup1", name: "Dup Space", type: "library", capacity: 10, building_id: null, description: null, layout_config: null, created_at: "", is_favorited: true },
      ],
      favoriteSpaces: [
        { id: "f1", user_id: "u1", space_id: "dup1", created_at: new Date().toISOString() },
      ],
      bookings: [
        {
          id: "bk1", space_id: "dup1", space_name: "Dup Space", space_type: "library",
          building_name: null, seat_id: "s1", start_time: new Date().toISOString(),
          end_time: new Date().toISOString(), status: "confirmed", user_id: "u1",
          checked_in_at: null, created_at: new Date().toISOString(), seat_label: "A1",
          seat_position: { x: 0, y: 0 }, space_layout_config: null, building_id: null,
        },
      ],
    });
    await renderHome();
    await waitFor(() => expect(screen.getAllByText("Dup Space").length).toBeGreaterThan(0));
    // In the For You rail, the space should appear only once
    const forYouRail = screen.getByTestId("for-you-rail");
    const dupCount = within(forYouRail).getAllByText("Dup Space").length;
    expect(dupCount).toBe(1);
    // Should appear as Favorite (higher priority than recent booking)
    expect(screen.getByText("Favorite")).toBeInTheDocument();
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

  test("still renders Buildings section when unauthenticated", async () => {
    await renderHome();
    // No location when unauthenticated — heading is generic "Buildings"
    expect(screen.getByText("Buildings")).toBeInTheDocument();
    expect(screen.getByText("Central Library")).toBeInTheDocument();
  });
});
