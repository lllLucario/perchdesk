"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBuildings, Building } from "@/lib/hooks";
import BuildingModal from "@/components/BuildingModal";

export default function BuildingsPage() {
  const router = useRouter();
  const { data: buildings, isLoading, isError } = useBuildings();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  if (isLoading) {
    return (
      <div>
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <Link href="/" className="hover:text-gray-700">Home</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Buildings</span>
        </nav>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Buildings</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
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
          <span className="text-gray-900 font-medium">Buildings</span>
        </nav>
        <p className="text-sm text-red-500">Failed to load buildings.</p>
      </div>
    );
  }

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Buildings</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Buildings</h1>

      {buildings && buildings.length === 0 ? (
        <p className="text-sm text-gray-400">No buildings available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings?.map((building) => (
            <div
              key={building.id}
              className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card body — click to open modal */}
              <button
                className="w-full text-left"
                onClick={() => setSelectedBuilding(building)}
              >
                <div className="h-32 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <span className="text-3xl">🏛</span>
                </div>
                <div className="px-5 pt-4 pb-3">
                  <p className="font-medium text-gray-900">{building.name}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{building.address}</p>
                </div>
              </button>

              {/* CTA — click to enter building flow */}
              <div className="px-5 pb-4">
                <button
                  onClick={() => router.push(`/buildings/${building.id}`)}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  View Spaces
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedBuilding && (
        <BuildingModal
          building={selectedBuilding}
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}
