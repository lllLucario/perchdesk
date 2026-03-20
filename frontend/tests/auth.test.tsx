/**
 * P1 Auth page tests: login, register, and auth store integration.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockRouter } from "./test-utils";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
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

const mockLogin = jest.fn();

jest.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (s: { login: typeof mockLogin }) => unknown) =>
    selector({ login: mockLogin }),
}));

// ─── Login page ───────────────────────────────────────────────────────────────

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  async function renderLogin() {
    const { default: LoginPage } = await import("@/app/(auth)/login/page");
    render(<LoginPage />);
  }

  test("renders login form", async () => {
    await renderLogin();
    expect(screen.getByText("Sign in to PerchDesk")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  test("successful login stores token and redirects", async () => {
    mockApi.post.mockResolvedValue({ access_token: "tok123", refresh_token: "ref123" });
    mockApi.get.mockResolvedValue({ id: "u1", email: "u@test.com", name: "User", role: "user" });

    await renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "u@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "u@test.com",
        password: "pass1234",
      });
      expect(window.localStorage.setItem).toHaveBeenCalledWith("access_token", "tok123");
      expect(mockLogin).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/spaces");
    });
  });

  test("shows error message on failed login", async () => {
    mockApi.post.mockRejectedValue(new Error("Unauthorized"));

    await renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "bad@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

// ─── Register page ────────────────────────────────────────────────────────────

describe("RegisterPage", () => {
  beforeEach(() => jest.clearAllMocks());

  async function renderRegister() {
    const { default: RegisterPage } = await import("@/app/(auth)/register/page");
    render(<RegisterPage />);
  }

  test("renders register form", async () => {
    await renderRegister();
    expect(screen.getByText("Create an account")).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("successful register redirects to login", async () => {
    mockApi.post.mockResolvedValue({ id: "u1", email: "new@test.com" });

    await renderRegister();

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secure123" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "Alice",
        email: "new@test.com",
        password: "secure123",
      });
      expect(mockRouter.push).toHaveBeenCalledWith("/login");
    });
  });

  test("shows error on duplicate email", async () => {
    mockApi.post.mockRejectedValue(new Error("DUPLICATE"));

    await renderRegister();

    fireEvent.change(screen.getByLabelText(/^name/i), { target: { value: "Bob" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "dup@test.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/registration failed/i)
      ).toBeInTheDocument();
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
