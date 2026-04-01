/**
 * Tests for My Spaces page and the RecommendationRibbon component.
 */
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import RecommendationRibbon from "@/components/RecommendationRibbon";

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

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => ({ isAuthenticated: true, user: { name: "Alice", role: "user" }, logout: jest.fn() }),
}));

// locationStore is reset per test via setState
import { useLocationStore, type LocationPermission, type Coordinates } from "@/store/locationStore";

const mockRequestLocation = jest.fn();

function setLocationState(overrides: {
  permission?: LocationPermission;
  coordinates?: Coordinates | null;
  acquiredAt?: number | null;
  requestLocation?: () => void;
  clearLocation?: () => void;
}) {
  useLocationStore.setState({
    permission: "idle",
    coordinates: null,
    acquiredAt: null,
    requestLocation: mockRequestLocation,
    clearLocation: jest.fn(),
    ...overrides,
  });
}

// ─── RecommendationRibbon ─────────────────────────────────────────────────────

describe("RecommendationRibbon", () => {
  test("renders 'Near you' for near_you reason", () => {
    renderWithProviders(<RecommendationRibbon reason="near_you" />);
    expect(screen.getByText("Near you")).toBeInTheDocument();
  });

  test("renders 'Closest available' for closest_available reason", () => {
    renderWithProviders(<RecommendationRibbon reason="closest_available" />);
    expect(screen.getByText("Closest available")).toBeInTheDocument();
  });

  test("has accessible aria-label", () => {
    renderWithProviders(<RecommendationRibbon reason="near_you" />);
    expect(screen.getByLabelText("Recommended: Near you")).toBeInTheDocument();
  });
});

// ─── My Spaces page ───────────────────────────────────────────────────────────

async function renderMySpaces() {
  const { default: MySpacesPage } = await import("@/app/(dashboard)/my-spaces/page");
  renderWithProviders(<MySpacesPage />);
}

describe("MySpacesPage — location idle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({ permission: "idle" });
  });

  test("renders page heading", async () => {
    await renderMySpaces();
    expect(screen.getByRole("heading", { name: "My Spaces" })).toBeInTheDocument();
  });

  test("renders all three section headings", async () => {
    await renderMySpaces();
    expect(screen.getByText("Recommended Spaces")).toBeInTheDocument();
    expect(screen.getByText("Favorite Spaces")).toBeInTheDocument();
    expect(screen.getByText("Recent Spaces")).toBeInTheDocument();
  });

  test("shows location permission prompt when idle", async () => {
    await renderMySpaces();
    expect(screen.getByText("Allow location access to see spaces near you")).toBeInTheDocument();
    expect(screen.getByText("Use my location")).toBeInTheDocument();
  });

  test("calls requestLocation when Use my location is clicked", async () => {
    await renderMySpaces();
    fireEvent.click(screen.getByText("Use my location"));
    expect(mockRequestLocation).toHaveBeenCalledTimes(1);
  });
});

describe("MySpacesPage — location loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({ permission: "loading" });
    mockApi.get.mockReturnValue(new Promise(() => {}));
  });

  test("shows loading skeletons while location is loading", async () => {
    await renderMySpaces();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("MySpacesPage — location granted with results", () => {
  const fakeRec = {
    space_id: "s1",
    space_name: "CBD Library",
    space_type: "library",
    capacity: 20,
    building_id: "b1",
    building_name: "CBD Building",
    building_address: "1 CBD St",
    building_latitude: -33.8688,
    building_longitude: 151.2093,
    distance_km: 0.1,
    reason: "closest_available" as const,
    available_seat_count: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
    });
    mockApi.get.mockResolvedValue([fakeRec]);
  });

  test("renders recommendation card after location is granted", async () => {
    await renderMySpaces();
    await waitFor(() => expect(screen.getByText("CBD Library")).toBeInTheDocument());
  });

  test("renders distance on card", async () => {
    await renderMySpaces();
    await waitFor(() => expect(screen.getByText("0.1 km away")).toBeInTheDocument());
  });

  test("renders RecommendationRibbon with correct label", async () => {
    await renderMySpaces();
    await waitFor(() => expect(screen.getByText("Closest available")).toBeInTheDocument());
  });
});

describe("MySpacesPage — location granted with no results", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
    });
    mockApi.get.mockResolvedValue([]);
  });

  test("shows empty message when no nearby spaces", async () => {
    await renderMySpaces();
    await waitFor(() =>
      expect(screen.getByText(/No nearby spaces found/)).toBeInTheDocument()
    );
  });
});

describe("MySpacesPage — location denied", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({ permission: "denied" });
  });

  test("shows denial fallback message", async () => {
    await renderMySpaces();
    expect(screen.getByText(/Location access was denied/)).toBeInTheDocument();
  });

  test("denial message links to buildings", async () => {
    await renderMySpaces();
    const link = screen.getByRole("link", { name: "Buildings" });
    expect(link).toHaveAttribute("href", "/buildings");
  });
});

describe("MySpacesPage — location unavailable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({ permission: "unavailable" });
  });

  test("shows unavailable fallback message", async () => {
    await renderMySpaces();
    expect(screen.getByText(/Location is unavailable/)).toBeInTheDocument();
  });
});

describe("MySpacesPage — nearby API error", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
    });
    mockApi.get.mockRejectedValue(new Error("Network error"));
  });

  test("shows error message instead of empty state when API fails", async () => {
    await renderMySpaces();
    await waitFor(() =>
      expect(screen.getByText(/Could not load nearby spaces/)).toBeInTheDocument()
    );
  });

  test("does not show 'No nearby spaces found' when there is an error", async () => {
    await renderMySpaces();
    await waitFor(() =>
      expect(screen.queryByText(/No nearby spaces found/)).not.toBeInTheDocument()
    );
  });
});
