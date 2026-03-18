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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-lg">PerchDesk Admin</span>
        <Link href="/spaces" className="text-sm text-gray-500 hover:text-gray-800">
          ← Back to App
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
