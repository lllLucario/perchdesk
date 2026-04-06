import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (accessToken: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (accessToken, user) => {
        localStorage.setItem("access_token", accessToken);
        set({ user, accessToken, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: "perchdesk-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
