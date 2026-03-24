"use client";

import Link from "next/link";
import { useSpaces } from "@/lib/hooks";

export default function HomePage() {
  const { data: spaces, isLoading } = useSpaces();

  const recentSpaces = spaces?.slice(0, 4) ?? [];

  // Placeholder buildings — no backend entity yet; will be wired up in PR 2
  const nearbyBuildings = [
    { id: "1", name: "Central Library", address: "123 Main Street", distance: "0.2 km" },
    { id: "2", name: "Tech Hub", address: "456 Innovation Ave", distance: "0.5 km" },
    { id: "3", name: "Business Centre", address: "789 Commerce Rd", distance: "1.1 km" },
    { id: "4", name: "Creative Quarter", address: "321 Arts Lane", distance: "1.4 km" },
  ];

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
        {isLoading ? (
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
        <div className="grid grid-cols-2 gap-3">
          {nearbyBuildings.map((building) => (
            <Link
              key={building.id}
              href="/buildings"
              className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <p className="font-medium text-gray-900 text-sm">{building.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{building.address}</p>
              <p className="text-xs text-gray-300 mt-0.5">{building.distance}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
