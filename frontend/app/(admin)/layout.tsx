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
          <div className="flex items-center gap-6">
            <span className="brand-wordmark">
              <span className="brand-mark">P</span>
              PerchDesk Admin
            </span>
            <Link href="/spaces" className="nav-link">
              Back to App
            </Link>
          </div>
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
