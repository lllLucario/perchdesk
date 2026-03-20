/**
 * P1 Spaces list page tests.
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

// ─── SpacesPage ───────────────────────────────────────────────────────────────

describe("SpacesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderSpaces() {
    const { default: SpacesPage } = await import("@/app/(dashboard)/spaces/page");
    renderWithProviders(<SpacesPage />);
  }

  test("shows loading state initially", async () => {
    // Never resolves during this test
    mockApi.get.mockReturnValue(new Promise(() => {}));
    await renderSpaces();
    expect(screen.getByText("Loading spaces…")).toBeInTheDocument();
  });

  test("renders space cards on success", async () => {
    mockApi.get.mockResolvedValue([
      { id: "s1", name: "Library A", type: "library", capacity: 20, layout_config: null, created_at: "" },
      { id: "s2", name: "Office B", type: "office", capacity: 10, layout_config: null, created_at: "" },
    ]);

    await renderSpaces();

    await waitFor(() => {
      expect(screen.getByText("Library A")).toBeInTheDocument();
      expect(screen.getByText("Office B")).toBeInTheDocument();
      expect(screen.getByText("20 seats")).toBeInTheDocument();
      expect(screen.getByText("10 seats")).toBeInTheDocument();
    });
  });

  test("shows empty message when no spaces", async () => {
    mockApi.get.mockResolvedValue([]);
    await renderSpaces();
    await waitFor(() => {
      expect(screen.getByText("No spaces available.")).toBeInTheDocument();
    });
  });

  test("shows error on fetch failure", async () => {
    mockApi.get.mockRejectedValue(new Error("Network error"));
    await renderSpaces();
    await waitFor(() => {
      expect(screen.getByText("Failed to load spaces.")).toBeInTheDocument();
    });
  });
});
