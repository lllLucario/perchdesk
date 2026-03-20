/**
 * P1 Admin layout guard tests.
 */
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { mockRouter } from "./test-utils";

// ─── Mocks ────────────────────────────────────────────────────────────────────

let authStoreState = { isAuthenticated: false, user: null as unknown };

jest.mock("@/store/authStore", () => ({
  useAuthStore: () => authStoreState,
}));

// ─── AdminLayout ──────────────────────────────────────────────────────────────

describe("AdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function renderAdmin(storeState: { isAuthenticated: boolean; user: unknown }) {
    authStoreState = storeState;
    const { default: AdminLayout } = await import("@/app/(admin)/layout");
    renderWithProviders(
      <AdminLayout>
        <div>Admin Content</div>
      </AdminLayout>
    );
  }

  test("redirects to /login when not authenticated", async () => {
    await renderAdmin({ isAuthenticated: false, user: null });
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  test("redirects to /spaces when authenticated but not admin", async () => {
    await renderAdmin({
      isAuthenticated: true,
      user: { id: "u1", email: "u@test.com", name: "User", role: "user" },
    });
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/spaces");
    });
  });

  test("renders admin content for admin user", async () => {
    await renderAdmin({
      isAuthenticated: true,
      user: { id: "a1", email: "admin@test.com", name: "Admin", role: "admin" },
    });
    await waitFor(() => {
      expect(screen.getByText("PerchDesk Admin")).toBeInTheDocument();
      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });
});
