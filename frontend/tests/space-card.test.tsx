/**
 * SpaceCard tests: rendering, favorite star interaction, and navigation.
 */
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, mockRouter } from "./test-utils";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Must use inline jest.fn() inside the factory because the factory executes
// before module-scope variables are initialized.
const mockApi = jest.requireActual("@/lib/api") as Record<string, never>;
void mockApi; // suppress unused lint — we reference it only to prove the path resolves

jest.mock("@/lib/api", () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  };
  return {
    api,
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

import { api } from "@/lib/api";
import SpaceCard from "@/components/SpaceCard";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SpaceCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseProps = {
    spaceId: "s1",
    name: "Library A",
    type: "library",
    capacity: 20,
  };

  test("renders name, type, and capacity", () => {
    renderWithProviders(<SpaceCard {...baseProps} />);
    expect(screen.getByText("Library A")).toBeInTheDocument();
    expect(screen.getByText("library · 20 seats")).toBeInTheDocument();
  });

  test("renders building name when provided", () => {
    renderWithProviders(<SpaceCard {...baseProps} buildingName="CBD Building" />);
    expect(screen.getByText("CBD Building")).toBeInTheDocument();
  });

  test("renders supporting line when provided", () => {
    renderWithProviders(<SpaceCard {...baseProps} supportingLine="0.1 km away" />);
    expect(screen.getByText("0.1 km away")).toBeInTheDocument();
  });

  test("renders ribbon when provided", () => {
    renderWithProviders(
      <SpaceCard {...baseProps} ribbon={<span data-testid="ribbon">Near you</span>} />
    );
    expect(screen.getByTestId("ribbon")).toBeInTheDocument();
  });

  test("navigates to space page on card click", () => {
    renderWithProviders(<SpaceCard {...baseProps} />);
    fireEvent.click(screen.getByText("Library A"));
    expect(mockRouter.push).toHaveBeenCalledWith("/spaces/s1");
  });

  // ── Favorite star ──

  test("shows unfavorited star by default", () => {
    renderWithProviders(<SpaceCard {...baseProps} />);
    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
  });

  test("shows favorited star when isFavorited is true", () => {
    renderWithProviders(<SpaceCard {...baseProps} isFavorited />);
    expect(screen.getByLabelText("Remove from favorites")).toBeInTheDocument();
  });

  test("clicking star calls POST to add favorite", async () => {
    (api.post as jest.Mock).mockResolvedValue({});
    renderWithProviders(<SpaceCard {...baseProps} isFavorited={false} />);
    fireEvent.click(screen.getByLabelText("Add to favorites"));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/api/v1/spaces/s1/favorite", {});
    });
  });

  test("clicking star calls DELETE to remove favorite", async () => {
    (api.delete as jest.Mock).mockResolvedValue(undefined);
    renderWithProviders(<SpaceCard {...baseProps} isFavorited />);
    fireEvent.click(screen.getByLabelText("Remove from favorites"));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("/api/v1/spaces/s1/favorite");
    });
  });

  test("star click does not trigger card navigation", async () => {
    (api.post as jest.Mock).mockResolvedValue({});
    renderWithProviders(<SpaceCard {...baseProps} />);
    fireEvent.click(screen.getByLabelText("Add to favorites"));
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
