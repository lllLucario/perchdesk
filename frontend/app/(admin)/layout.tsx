"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    } else if (user?.role !== "admin") {
      router.replace("/spaces");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-nav-inner">
          <div className="app-nav-group">
            <span className="brand-wordmark">
              <span className="brand-mark">P</span>
              PerchDesk Admin
            </span>
            <div className="app-nav-links">
              <Link href="/spaces/manage" className="nav-link nav-link-active">
                Manage Spaces
              </Link>
              <Link href="/spaces" className="nav-link">
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="shell-main shell-page">
        <div className="page-stack">{children}</div>
      </main>
    </div>
  );
}
