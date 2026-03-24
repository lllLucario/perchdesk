/**
 * Home page tests: layout, sections, auth states, and data wiring.
 */
import React from "react";
import { screen, waitFor } from "@testing-library/react";
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

let mockAuthState = {
  isAuthenticated: true,
  user: { name: "Alice", role: "user" },
  logout: jest.fn(),
};

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => mockAuthState,
}));

// ─── HomePage ─────────────────────────────────────────────────────────────────

describe("HomePage — authenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { isAuthenticated: true, user: { name: "Alice", role: "user" }, logout: jest.fn() };
  });

  async function renderHome() {
    const { default: HomePage } = await import("@/app/(public)/page");
    renderWithProviders(<HomePage />);
  }

  test("renders search input", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    expect(
      screen.getByPlaceholderText("Search for a building or space…")
    ).toBeInTheDocument();
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

  test("shows loading skeletons while spaces are loading", async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderHome();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });

  test("renders space cards after load", async () => {
    mockApi.get.mockResolvedValue([
      { id: "s1", name: "Library A", type: "library", capacity: 20, layout_config: null, created_at: "" },
      { id: "s2", name: "Office B", type: "office", capacity: 10, layout_config: null, created_at: "" },
    ]);
    await renderHome();
    await waitFor(() => {
      expect(screen.getByText("Library A")).toBeInTheDocument();
      expect(screen.getByText("Office B")).toBeInTheDocument();
    });
  });

  test("shows empty message when no spaces returned", async () => {
    mockApi.get.mockResolvedValue([]);
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
    const buildingLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/buildings");
    expect(buildingLinks.length).toBeGreaterThan(0);
  });
});

describe("HomePage — unauthenticated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { isAuthenticated: false, user: null as never, logout: jest.fn() };
  });

  async function renderHome() {
    const { default: HomePage } = await import("@/app/(public)/page");
    renderWithProviders(<HomePage />);
  }

  test("shows sign-in prompt instead of loading spaces", async () => {
    await renderHome();
    expect(
      screen.getByText("Sign in to see your recently used spaces")
    ).toBeInTheDocument();
  });

  test("does not show loading skeletons when unauthenticated", async () => {
    await renderHome();
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(0);
  });

  test("sign-in prompt links to /login", async () => {
    await renderHome();
    const loginLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href") === "/login");
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  test("still renders Nearby Buildings section", async () => {
    await renderHome();
    expect(screen.getByText("Nearby Buildings")).toBeInTheDocument();
    expect(screen.getByText("Central Library")).toBeInTheDocument();
  });
});
