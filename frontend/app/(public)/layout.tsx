"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-lg text-blue-600 hover:text-blue-700">
            PerchDesk
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/buildings" className="text-sm text-gray-600 hover:text-gray-900">
                Buildings
              </Link>
              <Link href="/my-spaces" className="text-sm text-gray-600 hover:text-gray-900">
                My Spaces
              </Link>
              <Link href="/bookings" className="text-sm text-gray-600 hover:text-gray-900">
                My Bookings
              </Link>
              {user?.role === "admin" && (
                <Link href="/spaces/manage" className="text-sm text-purple-600 hover:text-purple-800">
                  Admin
                </Link>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={() => { logout(); router.push("/login"); }}
                className="text-sm text-red-500 hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
