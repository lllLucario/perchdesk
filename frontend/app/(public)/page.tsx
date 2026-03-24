"use client";

import Link from "next/link";
import { useSpaces, useBuildings } from "@/lib/hooks";
import { useAuthStore } from "@/store/authStore";

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const { data: spaces, isLoading } = useSpaces();
  const { data: buildingsData } = useBuildings();

  const recentSpaces = spaces?.slice(0, 4) ?? [];
  const buildings = buildingsData?.slice(0, 4) ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search */}
      <div className="text-center py-14">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a building or space…"
            className="w-full px-5 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-sm"
            readOnly
          />
        </div>
        <p className="mt-3 text-xs text-gray-400">Browse below or search above</p>
      </div>

      {/* Recent Spaces */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Spaces
        </h2>
        {!isAuthenticated ? (
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-6 text-center">
            <p className="text-sm text-gray-400 mb-3">Sign in to see your recently used spaces</p>
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentSpaces.length === 0 ? (
          <p className="text-sm text-gray-400">No spaces found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentSpaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${space.id}`}
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{space.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {space.type} · {space.capacity} seats
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Nearby Buildings */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Nearby Buildings
        </h2>
        {buildings.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Central Library", address: "123 Main Street" },
              { name: "Tech Hub", address: "456 Innovation Ave" },
              { name: "Business Centre", address: "789 Commerce Rd" },
              { name: "Creative Quarter", address: "321 Arts Lane" },
            ].map((b) => (
              <Link
                key={b.name}
                href="/buildings"
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {buildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{building.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{building.address}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
