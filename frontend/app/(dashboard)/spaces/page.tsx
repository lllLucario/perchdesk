"use client";

import Link from "next/link";
import { useSpaces } from "@/lib/hooks";

export default function SpacesPage() {
  const { data: spaces, isLoading, error } = useSpaces();

  if (isLoading) return <p className="text-gray-500">Loading spaces…</p>;
  if (error) return <p className="text-red-500">Failed to load spaces.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Spaces</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces?.map((space) => (
          <Link
            key={space.id}
            href={`/spaces/${space.id}`}
            className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-semibold text-lg">{space.name}</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  space.type === "library"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {space.type === "library" ? "Library" : "Office"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{space.capacity} seats</p>
          </Link>
        ))}
        {spaces?.length === 0 && (
          <p className="text-gray-500 col-span-full">No spaces available.</p>
        )}
      </div>
    </div>
  );
}
