/**
 * Buildings page and Spaces-in-Building page tests.
 */
import React, { Suspense } from "react";
import { screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";

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

const SAMPLE_BUILDINGS = [
  {
    id: "b1",
    name: "City Campus",
    address: "1 University Ave",
    description: "Main campus.",
    opening_hours: { weekday: "08:00–20:00" },
    facilities: ["Wifi", "Cafeteria"],
    created_at: "",
  },
  {
    id: "b2",
    name: "Tech Park",
    address: "42 Innovation Drive",
    description: null,
    opening_hours: null,
    facilities: null,
    created_at: "",
  },
];

const SAMPLE_SPACES = [
  {
    id: "s1",
    building_id: "b1",
    name: "Central Library",
    type: "library",
    description: "Quiet study space.",
    capacity: 20,
    layout_config: null,
    created_at: "",
  },
  {
    id: "s2",
    building_id: "b1",
    name: "Innovation Hub",
    type: "office",
    description: null,
    capacity: 10,
    layout_config: null,
    created_at: "",
  },
];

// ─── BuildingsPage ────────────────────────────────────────────────────────────

describe("BuildingsPage", () => {
  beforeEach(() => jest.clearAllMocks());

  async function renderBuildings() {
    const { default: BuildingsPage } = await import(
      "@/app/(dashboard)/buildings/page"
    );
    renderWithProviders(<BuildingsPage />);
  }

  test("shows loading skeletons initially", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderBuildings();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });

  test("renders building cards after load", async () => {
    mockApi.get.mockResolvedValue(SAMPLE_BUILDINGS);
    await renderBuildings();
    await waitFor(() => {
      expect(screen.getByText("City Campus")).toBeInTheDocument();
      expect(screen.getByText("Tech Park")).toBeInTheDocument();
    });
  });

  test("renders address on each card", async () => {
    mockApi.get.mockResolvedValue(SAMPLE_BUILDINGS);
    await renderBuildings();
    await waitFor(() => {
      expect(screen.getByText("1 University Ave")).toBeInTheDocument();
    });
  });

  test("shows empty message when no buildings", async () => {
    mockApi.get.mockResolvedValue([]);
    await renderBuildings();
    await waitFor(() => {
      expect(screen.getByText("No buildings available.")).toBeInTheDocument();
    });
  });

  test("shows error message on fetch failure", async () => {
    mockApi.get.mockRejectedValue(new Error("Network error"));
    await renderBuildings();
    await waitFor(() => {
      expect(screen.getByText("Failed to load buildings.")).toBeInTheDocument();
    });
  });

  test("View Spaces button navigates to buildings/[id]", async () => {
    mockApi.get.mockResolvedValue(SAMPLE_BUILDINGS);
    await renderBuildings();
    await waitFor(() => screen.getByText("City Campus"));
    const buttons = screen.getAllByRole("button", { name: "View Spaces" });
    fireEvent.click(buttons[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/buildings/b1");
  });
});

// ─── SpacesInBuildingPage ─────────────────────────────────────────────────────

describe("SpacesInBuildingPage", () => {
  beforeEach(() => jest.clearAllMocks());

  async function renderSpacesInBuilding() {
    const { default: SpacesInBuildingPage } = await import(
      "@/app/(dashboard)/buildings/[id]/page"
    );
    await act(async () => {
      renderWithProviders(
        <Suspense fallback={<div>loading…</div>}>
          <SpacesInBuildingPage params={Promise.resolve({ id: "b1" })} />
        </Suspense>
      );
    });
  }

  test("renders page heading with building name", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve(SAMPLE_SPACES);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => {
      expect(screen.getByText("Spaces in City Campus")).toBeInTheDocument();
    });
  });

  test("renders space cards", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve(SAMPLE_SPACES);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => {
      expect(screen.getByText("Central Library")).toBeInTheDocument();
      expect(screen.getByText("Innovation Hub")).toBeInTheDocument();
    });
  });

  test("shows type badge on each card", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve(SAMPLE_SPACES);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => {
      expect(screen.getByText("library")).toBeInTheDocument();
      expect(screen.getByText("office")).toBeInTheDocument();
    });
  });

  test("shows empty message when building has no spaces", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve([]);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => {
      expect(
        screen.getByText("No spaces available in this building.")
      ).toBeInTheDocument();
    });
  });

  test("Book a Seat button navigates to /spaces/[id]", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve(SAMPLE_SPACES);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => screen.getAllByRole("button", { name: "Book a Seat" }));
    const buttons = screen.getAllByRole("button", { name: "Book a Seat" });
    fireEvent.click(buttons[0]);
    expect(mockRouter.push).toHaveBeenCalledWith("/spaces/s1");
  });

  test("page does not contain building description (semantic constraint)", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/api/v1/buildings/b1") return Promise.resolve(SAMPLE_BUILDINGS[0]);
      if (url === "/api/v1/buildings/b1/spaces") return Promise.resolve(SAMPLE_SPACES);
      return Promise.resolve([]);
    });
    await renderSpacesInBuilding();
    await waitFor(() => screen.getByText("Central Library"));
    // Building description must NOT appear on this page (belongs in modal only)
    expect(screen.queryByText("Main campus.")).not.toBeInTheDocument();
  });
});
