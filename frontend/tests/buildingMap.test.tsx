/**
 * Building Map page tests.
 *
 * react-leaflet and leaflet are mocked entirely so the tests can run in jsdom
 * without a real browser map context.  The mocks expose just enough surface
 * to exercise page-level behaviour: list rendering, selection, location
 * control, and empty/error states.
 */
import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";
import { useLocationStore } from "@/store/locationStore";
import type { LocationPermission, Coordinates } from "@/store/locationStore";

// ─── Dependency mocks ─────────────────────────────────────────────────────────

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

// Mock react-leaflet — the page imports BuildingMap with ssr:false, which next/dynamic
// resolves in jsdom without SSR.  We still mock react-leaflet so the underlying map
// component does not try to boot a real Leaflet instance.
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) => (
    <div data-testid="map-marker" onClick={eventHandlers?.click}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMapEvents: (_handlers: unknown) => ({ getBounds: jest.fn() }),
  useMap: () => ({ flyTo: jest.fn(), getZoom: jest.fn(() => 11) }),
}));

jest.mock("leaflet", () => ({
  divIcon: jest.fn(() => ({})),
  Map: class {},
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
}));

// next/dynamic resolves to the actual module in jest (no ssr boundary in jsdom).
// Mocking it ensures BuildingMap renders as a stub without the CSS import failing.
jest.mock("@/components/BuildingMap", () =>
  function MockBuildingMap({ buildings, selectedId, onSelectBuilding, onBoundsChange }: {
    buildings: Array<{ id: string; name: string; latitude: number; longitude: number }>;
    selectedId: string | null;
    onSelectBuilding: (id: string) => void;
    onBoundsChange: (b: unknown) => void;
  }) {
    return (
      <div data-testid="building-map">
        {buildings.map((b) => (
          <button
            key={b.id}
            data-testid={`map-pin-${b.id}`}
            onClick={() => {
              onSelectBuilding(b.id);
              onBoundsChange({ minLat: -34, minLng: 150, maxLat: -33, maxLng: 152 });
            }}
          >
            {b.name} pin
          </button>
        ))}
        {selectedId && <div data-testid="selected-pin">{selectedId}</div>}
      </div>
    );
  }
);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const B_WITH_COORDS = {
  id: "b1",
  name: "City Campus",
  address: "1 University Ave",
  description: null,
  opening_hours: null,
  facilities: null,
  latitude: -33.87,
  longitude: 151.21,
  created_at: "",
};

const B_NO_COORDS = {
  id: "b2",
  name: "Remote Office",
  address: "99 Nowhere St",
  description: null,
  opening_hours: null,
  facilities: null,
  latitude: null,
  longitude: null,
  created_at: "",
};

const B_WITH_COORDS_2 = {
  id: "b3",
  name: "Tech Park",
  address: "42 Innovation Drive",
  description: null,
  opening_hours: null,
  facilities: null,
  latitude: -33.9,
  longitude: 151.18,
  created_at: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

async function renderMapPage() {
  const { default: BuildingMapPage } = await import(
    "@/app/(dashboard)/buildings/map/page"
  );
  renderWithProviders(<BuildingMapPage />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BuildingMapPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocationState({ permission: "idle" });
  });

  test("shows loading skeleton while buildings are fetching", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderMapPage();
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  test("shows error message when buildings fail to load", async () => {
    mockApi.get.mockRejectedValue(new Error("Network error"));
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByText("Failed to load buildings.")).toBeInTheDocument()
    );
  });

  test("renders buildings with coordinates in the sidebar list", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS, B_NO_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByText("City Campus")).toBeInTheDocument()
    );
    // Building without coords must NOT appear in the list
    expect(screen.queryByText("Remote Office")).not.toBeInTheDocument();
  });

  test("renders the map component when coordinated buildings exist", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByTestId("building-map")).toBeInTheDocument()
    );
  });

  test("shows no-coordinates fallback when all buildings lack coordinates", async () => {
    mockApi.get.mockResolvedValue([B_NO_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(
        screen.getByText("No buildings have location data yet.")
      ).toBeInTheDocument()
    );
  });

  test("clicking a sidebar building selects it (blue highlight)", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS, B_WITH_COORDS_2]);
    await renderMapPage();
    await waitFor(() => screen.getByText("City Campus"));

    const card = screen.getByText("City Campus").closest("[data-building-id]");
    fireEvent.click(card!);

    await waitFor(() =>
      expect(card).toHaveClass("bg-blue-50")
    );
  });

  test("clicking a map marker selects the building in the sidebar", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByTestId("map-pin-b1"));

    fireEvent.click(screen.getByTestId("map-pin-b1"));

    await waitFor(() =>
      expect(screen.getByTestId("selected-pin")).toHaveTextContent("b1")
    );
  });

  test("View Spaces button navigates to /buildings/[id]", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByText("View Spaces →"));

    const btn = screen.getByText("View Spaces →");
    fireEvent.click(btn);

    expect(mockRouter.push).toHaveBeenCalledWith("/buildings/b1");
  });

  test("shows 'Use my location' button when permission is idle", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByText(/Use my location/));
    expect(screen.getByText(/Use my location/)).toBeInTheDocument();
  });

  test("clicking 'Use my location' calls requestLocation", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByText(/Use my location/));

    fireEvent.click(screen.getByText(/Use my location/));
    expect(mockRequestLocation).toHaveBeenCalledTimes(1);
  });

  test("shows 'Locating…' when permission is loading", async () => {
    setLocationState({ permission: "loading" });
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => expect(screen.getByText("Locating…")).toBeInTheDocument());
  });

  test("shows 'Location active' when permission is granted", async () => {
    setLocationState({
      permission: "granted",
      coordinates: { latitude: -33.87, longitude: 151.21, accuracy: 10 },
    });
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByText(/Location active/)).toBeInTheDocument()
    );
  });

  test("shows 'Location unavailable' when permission is denied", async () => {
    setLocationState({ permission: "denied" });
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByText("Location unavailable")).toBeInTheDocument()
    );
  });

  test("shows 'Location unavailable' when permission is unavailable", async () => {
    setLocationState({ permission: "unavailable" });
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() =>
      expect(screen.getByText("Location unavailable")).toBeInTheDocument()
    );
  });

  test("'List view' link points to /buildings", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByText("City Campus"));
    const link = screen.getByRole("link", { name: "List view" });
    expect(link).toHaveAttribute("href", "/buildings");
  });

  test("'Browse all buildings' link appears when no buildings in viewport", async () => {
    // within-bounds returns empty; initial coordinated list is also empty
    mockApi.get.mockResolvedValue([B_NO_COORDS]);
    await renderMapPage();
    await waitFor(() => screen.getByText("Browse all buildings →"));
    const link = screen.getByText("Browse all buildings →");
    expect(link).toHaveAttribute("href", "/buildings");
  });

  test("within-bounds error shows error message instead of falling back to full list", async () => {
    // Initial buildings load succeeds; the within-bounds query fails.
    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith("/api/v1/buildings/within-bounds")) {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve([B_WITH_COORDS]);
    });
    await renderMapPage();
    await waitFor(() => screen.getByTestId("map-pin-b1"));

    // Clicking the pin fires onBoundsChange → sets viewportBounds → triggers within-bounds query
    fireEvent.click(screen.getByTestId("map-pin-b1"));

    await waitFor(() =>
      expect(
        screen.getByText("Failed to load buildings in this area.")
      ).toBeInTheDocument()
    );
    // Full list must NOT be shown as a silent fallback
    expect(screen.queryByText("City Campus")).not.toBeInTheDocument();
  });
});

// ─── BuildingsPage: Map view toggle ───────────────────────────────────────────

describe("BuildingsPage Map toggle", () => {
  beforeEach(() => jest.clearAllMocks());

  async function renderBuildings() {
    const { default: BuildingsPage } = await import(
      "@/app/(dashboard)/buildings/page"
    );
    renderWithProviders(<BuildingsPage />);
  }

  test("renders a 'Map view' link pointing to /buildings/map", async () => {
    mockApi.get.mockResolvedValue([B_WITH_COORDS]);
    await renderBuildings();
    await waitFor(() => screen.getByText("City Campus"));
    const link = screen.getByRole("link", { name: /Map view/ });
    expect(link).toHaveAttribute("href", "/buildings/map");
  });
});
