"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBuilding, useBuildingSpaces, Space } from "@/lib/hooks";
import SpaceModal from "@/components/SpaceModal";

export default function SpacesInBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: building, isLoading: buildingLoading } = useBuilding(id);
  const { data: spaces, isLoading: spacesLoading, isError } = useBuildingSpaces(id);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  const isLoading = buildingLoading || spacesLoading;
  const buildingName = building?.name ?? "Building";

  if (isLoading) {
    return (
      <div>
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
          <span>/</span>
          <span className="text-gray-400">Loading…</span>
        </nav>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
        </nav>
        <p className="text-sm text-red-500">Failed to load spaces for this building.</p>
      </div>
    );
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{buildingName}</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        Spaces in {buildingName}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        Choose a space to start booking
      </p>

      {spaces && spaces.length === 0 ? (
        <p className="text-sm text-gray-400">No spaces available in this building.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces?.map((space) => (
            <div
              key={space.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card body — click to open modal */}
              <button
                className="w-full text-left px-5 pt-5 pb-3"
                onClick={() => setSelectedSpace(space)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium text-gray-900">{space.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                    {space.type}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{space.capacity} seats</p>
                {space.description && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{space.description}</p>
                )}
              </button>

              {/* CTA — enter floorplan */}
              <div className="px-5 pb-4">
                <button
                  onClick={() => router.push(`/spaces/${space.id}`)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Book a Seat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSpace && (
        <SpaceModal
          space={selectedSpace}
          buildingName={buildingName}
          onClose={() => setSelectedSpace(null)}
        />
      )}
    </div>
  );
}
