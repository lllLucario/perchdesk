"use client";

import { useRouter } from "next/navigation";
import { Building } from "@/lib/hooks";

interface Props {
  building: Building;
  spaceCount?: number;
  onClose: () => void;
}

export default function BuildingModal({ building, spaceCount, onClose }: Props) {
  const router = useRouter();

  function handleViewSpaces() {
    onClose();
    router.push(`/buildings/${building.id}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero placeholder */}
        <div className="h-36 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <span className="text-4xl">🏛</span>
        </div>

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{building.name}</h2>
          <p className="text-sm text-gray-500 mb-4">{building.address}</p>

          {building.description && (
            <p className="text-sm text-gray-600 mb-4">{building.description}</p>
          )}

          {(building.opening_hours || spaceCount !== undefined) && (
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              {building.opening_hours && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Opening Hours</p>
                  {Object.entries(building.opening_hours).map(([k, v]) => (
                    <p key={k} className="text-gray-700 capitalize">
                      {k}: {v}
                    </p>
                  ))}
                </div>
              )}
              {spaceCount !== undefined && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spaces</p>
                  <p className="text-gray-700">{spaceCount} spaces</p>
                </div>
              )}
            </div>
          )}

          {building.facilities && building.facilities.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Facilities</p>
              <div className="flex flex-wrap gap-1.5">
                {building.facilities.map((f) => (
                  <span
                    key={f}
                    className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleViewSpaces}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View Spaces →
          </button>
        </div>
      </div>
    </div>
  );
}
