"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="flex items-center gap-6">
            <Link href="/" className="brand-wordmark">
              <span className="brand-mark">P</span>
              PerchDesk
            </Link>
            <Link href="/buildings" className="nav-link">
              Buildings
            </Link>
            <Link href="/my-spaces" className="nav-link">
              My Spaces
            </Link>
            <Link href="/bookings" className="nav-link">
              My Bookings
            </Link>
            {user?.role === "admin" && (
              <Link href="/spaces/manage" className="nav-link nav-link-accent">
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-muted">{user?.name}</span>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="nav-link nav-link-danger text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
