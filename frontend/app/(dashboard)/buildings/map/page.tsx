"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useBuildings,
  useBuildingsWithinBounds,
  type BuildingWithCoords,
  type BuildingsWithinBoundsParams,
} from "@/lib/hooks";
import { useLocationStore } from "@/store/locationStore";

// BuildingMap uses Leaflet which requires browser APIs — disable SSR.
const BuildingMap = dynamic(() => import("@/components/BuildingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-sm text-gray-400">Loading map…</span>
    </div>
  ),
});

export default function BuildingMapPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportBounds, setViewportBounds] = useState<BuildingsWithinBoundsParams | null>(null);

  const { permission, coordinates, requestLocation } = useLocationStore();
  const { data: allBuildings, isLoading, isError } = useBuildings();
  const {
    data: boundsBuildings,
    isError: boundsError,
  } = useBuildingsWithinBounds(viewportBounds);

  // Only buildings with coordinates can appear as map markers.
  const coordinatedBuildings: BuildingWithCoords[] = (allBuildings ?? []).filter(
    (b): b is BuildingWithCoords => b.latitude !== null && b.longitude !== null
  );

  // Sidebar list derivation:
  //   - No viewport yet (initial load)  → show all coordinated buildings
  //   - Viewport known, query failed    → null signals an explicit error state;
  //                                       must NOT fall back to full list or the
  //                                       failure looks like a valid result
  //   - Viewport known, loading/success → within-bounds results (or full list
  //                                       while the first fetch is in flight)
  const listBuildings =
    viewportBounds !== null && boundsError ? null : boundsBuildings ?? coordinatedBuildings;

  const mapCenter: [number, number] | undefined =
    permission === "granted" && coordinates
      ? [coordinates.latitude, coordinates.longitude]
      : undefined;

  // ─── Loading / error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div>
        <div className="h-5 bg-gray-100 rounded w-56 animate-pulse mb-6" />
        <div className="h-[520px] bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <Breadcrumb />
        <p className="text-sm text-red-500 mt-4">Failed to load buildings.</p>
      </div>
    );
  }

  // ─── Main layout ──────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <Breadcrumb />
        <div className="flex items-center gap-3">
          <LocationControl
            permission={permission}
            onRequestLocation={requestLocation}
          />
          <Link
            href="/buildings"
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            List view
          </Link>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex gap-0 border border-gray-100 rounded-2xl overflow-hidden h-[520px]">
        {/* Sidebar list */}
        <div className="w-64 flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          <BuildingList
            buildings={listBuildings}
            selectedId={selectedId}
            viewportBounds={viewportBounds}
            boundsError={viewportBounds !== null && boundsError}
            onSelect={setSelectedId}
            onViewSpaces={(id) => router.push(`/buildings/${id}`)}
          />
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          {coordinatedBuildings.length === 0 ? (
            <NoCoordinatesMessage />
          ) : (
            <BuildingMap
              buildings={coordinatedBuildings}
              selectedId={selectedId}
              onSelectBuilding={setSelectedId}
              onBoundsChange={setViewportBounds}
              center={mapCenter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <nav className="text-sm text-gray-500 flex items-center gap-2">
      <Link href="/" className="hover:text-gray-700">
        Home
      </Link>
      <span>/</span>
      <Link href="/buildings" className="hover:text-gray-700">
        Buildings
      </Link>
      <span>/</span>
      <span className="text-gray-900 font-medium">Map</span>
    </nav>
  );
}

function LocationControl({
  permission,
  onRequestLocation,
}: {
  permission: string;
  onRequestLocation: () => void;
}) {
  if (permission === "idle") {
    return (
      <button
        onClick={onRequestLocation}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        <span aria-hidden>📍</span> Use my location
      </button>
    );
  }
  if (permission === "loading") {
    return <span className="text-sm text-gray-400">Locating…</span>;
  }
  if (permission === "granted") {
    return <span className="text-sm text-green-600">📍 Location active</span>;
  }
  // denied or unavailable
  return <span className="text-sm text-gray-400">Location unavailable</span>;
}

function BuildingList({
  buildings,
  selectedId,
  viewportBounds,
  boundsError,
  onSelect,
  onViewSpaces,
}: {
  buildings: BuildingWithCoords[] | null;
  selectedId: string | null;
  viewportBounds: BuildingsWithinBoundsParams | null;
  boundsError: boolean;
  onSelect: (id: string) => void;
  onViewSpaces: (id: string) => void;
}) {
  if (boundsError) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-500">Failed to load buildings in this area.</p>
        <p className="text-xs text-gray-400 mt-1">Try moving the map or zooming out.</p>
      </div>
    );
  }

  if (!buildings || buildings.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-400">
          {viewportBounds
            ? "No buildings in this area. Try zooming out."
            : "No buildings with location data available."}
        </p>
        <Link
          href="/buildings"
          className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          Browse all buildings →
        </Link>
      </div>
    );
  }

  // buildings is non-null and non-empty at this point (guards above).
  return (
    <div className="divide-y divide-gray-50">
      {(buildings as BuildingWithCoords[]).map((b) => (
        <div
          key={b.id}
          data-building-id={b.id}
          onClick={() => onSelect(b.id)}
          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
            b.id === selectedId ? "bg-blue-50 border-l-2 border-blue-600" : "border-l-2 border-transparent"
          }`}
        >
          <p className="font-medium text-gray-900 text-sm">{b.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{b.address}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSpaces(b.id);
            }}
            className="mt-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View Spaces →
          </button>
        </div>
      ))}
    </div>
  );
}

function NoCoordinatesMessage() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="text-center px-6">
        <p className="text-sm text-gray-500 mb-2">
          No buildings have location data yet.
        </p>
        <Link href="/buildings" className="text-sm text-blue-600 hover:text-blue-700">
          Browse buildings by list →
        </Link>
      </div>
    </div>
  );
}
