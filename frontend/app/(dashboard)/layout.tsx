"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/buildings", label: "Buildings" },
    { href: "/my-spaces", label: "My Spaces" },
    { href: "/bookings", label: "My Bookings" },
  ];

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-group">
            <Link href="/" className="brand-wordmark">
              <span className="brand-mark">P</span>
              PerchDesk
            </Link>
            <div className="app-nav-links">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {user?.role === "admin" && (
              <Link
                href="/spaces/manage"
                className={`nav-link nav-link-accent ${
                  pathname === "/spaces/manage" ? "nav-link-active" : ""
                }`}
              >
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 rounded-full border border-border bg-surface px-3 py-2 md:flex">
              <span className="brand-mark h-8 w-8 text-sm">{user?.name?.slice(0, 1) ?? "U"}</span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-text-strong">{user?.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-text-soft">Workspace</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="nav-link nav-link-danger text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="shell-main shell-page">
        <div className="page-stack">{children}</div>
      </main>
    </div>
  );
}
