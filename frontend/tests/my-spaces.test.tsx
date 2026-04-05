/**
 * My Spaces page tests: Favorite, Recent, and Recommended sections with
 * card decoration rules, empty states, and loading behavior.
 */
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { useLocationStore } from "@/store/locationStore";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/api", () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  };
  return {
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
  };
});

// Import api after mock is established
import { api } from "@/lib/api";
const mockApi = api as jest.Mocked<typeof api>;

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: { name: "Alice", role: "user" },
    logout: jest.fn(),
  }),
}));

function resetLocation() {
  useLocationStore.setState({
    permission: "idle",
    coordinates: null,
    acquiredAt: null,
    requestLocation: jest.fn(),
    clearLocation: jest.fn(),
  });
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SPACE_A = {
  id: "s1",
  building_id: "b1",
  name: "Study Room A",
  type: "library",
  description: null,
  capacity: 10,
  layout_config: null,
  created_at: "2026-01-01T00:00:00Z",
  is_favorited: true,
};

const SPACE_B = {
  id: "s2",
  building_id: "b1",
  name: "Office Hub B",
  type: "office",
  description: null,
  capacity: 20,
  layout_config: null,
  created_at: "2026-01-01T00:00:00Z",
  is_favorited: false,
};

const SPACE_C = {
  id: "s3",
  building_id: "b2",
  name: "Creative Lab C",
  type: "library",
  description: null,
  capacity: 15,
  layout_config: null,
  created_at: "2026-01-01T00:00:00Z",
  is_favorited: false,
};

function mockApiResolved({
  spaces = [] as object[],
  bookings = [] as object[],
  favoriteSpaces = [] as object[],
  recentVisits = [] as object[],
} = {}) {
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes("/me/favorite-spaces")) return Promise.resolve(favoriteSpaces);
    if (url.includes("/me/recent-spaces")) return Promise.resolve(recentVisits);
    if (url.includes("/bookings")) return Promise.resolve(bookings);
    if (url.includes("/spaces")) return Promise.resolve(spaces);
    return Promise.resolve([]);
  });
}

// ─── Import page after mocks ─────────────────────────────────────────────────

import MySpacesPage from "@/app/(dashboard)/my-spaces/page";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MySpacesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetLocation();
  });

  // --- Page structure ---

  it("renders the page header and breadcrumb", async () => {
    mockApiResolved();
    renderWithProviders(<MySpacesPage />);
    expect(screen.getByRole("heading", { level: 1, name: "My Spaces" })).toBeInTheDocument();
    expect(screen.getByText("Personalized access to spaces you use most")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renders all three section headings", async () => {
    mockApiResolved();
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Favorite Spaces")).toBeInTheDocument();
      expect(screen.getByText("Recent Spaces")).toBeInTheDocument();
      expect(screen.getByText("Recommended Spaces")).toBeInTheDocument();
    });
  });

  // --- Favorite Spaces section ---

  it("shows favorite spaces when data is available", async () => {
    mockApiResolved({
      spaces: [SPACE_A, SPACE_B],
      favoriteSpaces: [
        { id: "f1", user_id: "u1", space_id: "s1", created_at: "2026-01-01T00:00:00Z" },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Study Room A")).toBeInTheDocument();
    });
  });

  it("shows empty state when no favorites exist", async () => {
    mockApiResolved({ spaces: [SPACE_A], favoriteSpaces: [] });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No favorite spaces yet/)).toBeInTheDocument();
    });
  });

  it("favorite cards do not render a recommendation ribbon", async () => {
    mockApiResolved({
      spaces: [SPACE_A],
      favoriteSpaces: [
        { id: "f1", user_id: "u1", space_id: "s1", created_at: "2026-01-01T00:00:00Z" },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Study Room A")).toBeInTheDocument();
    });
    // No ribbon labels should appear for favorite cards
    expect(screen.queryByText("Near you")).not.toBeInTheDocument();
    expect(screen.queryByText("Closest available")).not.toBeInTheDocument();
  });

  // --- Recent Spaces section ---

  it("shows recently booked spaces with supporting line", async () => {
    mockApiResolved({
      spaces: [SPACE_A, SPACE_B],
      bookings: [
        {
          id: "bk1",
          user_id: "u1",
          seat_id: "seat1",
          space_id: "s2",
          start_time: "2026-01-05T09:00:00Z",
          end_time: "2026-01-05T10:00:00Z",
          status: "confirmed",
          checked_in_at: null,
          created_at: "2026-01-05T00:00:00Z",
          seat_label: "A1",
          seat_position: { x: 0, y: 0 },
          space_name: "Office Hub B",
          space_layout_config: null,
          building_id: "b1",
          building_name: "Building 1",
        },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Office Hub B")).toBeInTheDocument();
      expect(screen.getByText("Booked recently")).toBeInTheDocument();
    });
  });

  it("shows recently visited spaces with supporting line", async () => {
    mockApiResolved({
      spaces: [SPACE_C],
      recentVisits: [
        { id: "v1", user_id: "u1", space_id: "s3", visited_at: "2026-01-04T00:00:00Z" },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Creative Lab C")).toBeInTheDocument();
      expect(screen.getByText("Visited recently")).toBeInTheDocument();
    });
  });

  it("deduplicates spaces — booking wins over visit for same space", async () => {
    mockApiResolved({
      spaces: [SPACE_B],
      bookings: [
        {
          id: "bk1",
          user_id: "u1",
          seat_id: "seat1",
          space_id: "s2",
          start_time: "2026-01-05T09:00:00Z",
          end_time: "2026-01-05T10:00:00Z",
          status: "confirmed",
          checked_in_at: null,
          created_at: "2026-01-05T00:00:00Z",
          seat_label: "A1",
          seat_position: { x: 0, y: 0 },
          space_name: "Office Hub B",
          space_layout_config: null,
          building_id: "b1",
          building_name: "Building 1",
        },
      ],
      recentVisits: [
        { id: "v1", user_id: "u1", space_id: "s2", visited_at: "2026-01-04T00:00:00Z" },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      // Space appears once with booking supporting line
      expect(screen.getByText("Office Hub B")).toBeInTheDocument();
      expect(screen.getByText("Booked recently")).toBeInTheDocument();
      expect(screen.queryByText("Visited recently")).not.toBeInTheDocument();
    });
  });

  it("excludes cancelled and expired bookings from recent spaces", async () => {
    mockApiResolved({
      spaces: [SPACE_A, SPACE_B],
      bookings: [
        {
          id: "bk-cancelled",
          user_id: "u1",
          seat_id: "seat1",
          space_id: "s1",
          start_time: "2026-01-05T09:00:00Z",
          end_time: "2026-01-05T10:00:00Z",
          status: "cancelled",
          checked_in_at: null,
          created_at: "2026-01-05T00:00:00Z",
          seat_label: "A1",
          seat_position: { x: 0, y: 0 },
          space_name: "Study Room A",
          space_layout_config: null,
          building_id: "b1",
          building_name: "Building 1",
        },
        {
          id: "bk-expired",
          user_id: "u1",
          seat_id: "seat2",
          space_id: "s2",
          start_time: "2026-01-04T09:00:00Z",
          end_time: "2026-01-04T10:00:00Z",
          status: "expired",
          checked_in_at: null,
          created_at: "2026-01-04T00:00:00Z",
          seat_label: "B1",
          seat_position: { x: 0, y: 0 },
          space_name: "Office Hub B",
          space_layout_config: null,
          building_id: "b1",
          building_name: "Building 1",
        },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      // Neither cancelled nor expired bookings should appear
      expect(screen.queryByText("Booked recently")).not.toBeInTheDocument();
      expect(screen.getByText(/No recent activity yet/)).toBeInTheDocument();
    });
  });

  it("shows empty state when no recent activity exists", async () => {
    mockApiResolved({ spaces: [SPACE_A] });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText(/No recent activity yet/)).toBeInTheDocument();
    });
  });

  // --- Recommended Spaces section ---

  it("shows location idle nudge in recommended section", async () => {
    mockApiResolved({ spaces: [SPACE_A] });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Use my location")).toBeInTheDocument();
    });
  });

  it("shows recommended cards with ribbon when location is granted", async () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.87, longitude: 151.21, accuracy: 10 },
      acquiredAt: Date.now(),
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes("/spaces/nearby")) {
        return Promise.resolve([
          {
            space_id: "s10",
            space_name: "Nearby Hub",
            space_type: "office",
            capacity: 8,
            building_id: "b10",
            building_name: "Near Building",
            building_address: "1 Close St",
            building_latitude: -33.87,
            building_longitude: 151.21,
            distance_km: 0.3,
            reason: "near_you",
            available_seat_count: 5,
            is_favorited: false,
          },
        ]);
      }
      if (url.includes("/me/favorite-spaces")) return Promise.resolve([]);
      if (url.includes("/me/recent-spaces")) return Promise.resolve([]);
      if (url.includes("/bookings")) return Promise.resolve([]);
      return Promise.resolve([SPACE_A]);
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText("Nearby Hub")).toBeInTheDocument();
      expect(screen.getByText("Near you")).toBeInTheDocument();
      expect(screen.getByText("0.3 km away")).toBeInTheDocument();
    });
  });

  it("shows denied message in recommended section when location denied", async () => {
    useLocationStore.setState({
      permission: "denied",
      coordinates: null,
      acquiredAt: null,
      requestLocation: jest.fn(),
      clearLocation: jest.fn(),
    });
    mockApiResolved({ spaces: [SPACE_A] });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      expect(screen.getByText(/Location access was denied/)).toBeInTheDocument();
    });
  });

  // --- Cross-section behavior ---

  it("same space can appear in both favorites and recents (no cross-section dedup)", async () => {
    mockApiResolved({
      spaces: [SPACE_A],
      favoriteSpaces: [
        { id: "f1", user_id: "u1", space_id: "s1", created_at: "2026-01-01T00:00:00Z" },
      ],
      recentVisits: [
        { id: "v1", user_id: "u1", space_id: "s1", visited_at: "2026-01-04T00:00:00Z" },
      ],
    });
    renderWithProviders(<MySpacesPage />);
    await waitFor(() => {
      // Space A appears in both sections
      const spaceCards = screen.getAllByText("Study Room A");
      expect(spaceCards.length).toBe(2);
    });
  });

  // --- Loading states ---

  it("shows skeletons while spaces are loading", () => {
    // Never resolve the API call
    mockApi.get.mockImplementation(() => new Promise(() => {}));
    const { container } = renderWithProviders(<MySpacesPage />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
