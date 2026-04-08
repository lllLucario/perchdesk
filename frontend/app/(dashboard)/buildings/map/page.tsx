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
    <div className="flex h-full items-center justify-center bg-[color:color-mix(in_srgb,var(--color-accent-muted)_52%,white_48%)] animate-pulse">
      <span className="text-sm text-text-soft">Loading map…</span>
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
      <div className="page-stack">
        <div className="mb-6 h-5 w-56 animate-pulse rounded bg-surface-muted" />
        <div className="h-[520px] animate-pulse rounded-[2rem] bg-surface-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-stack">
        <Breadcrumb />
        <p className="mt-4 text-sm text-danger">Failed to load buildings.</p>
      </div>
    );
  }

  // ─── Main layout ──────────────────────────────────────────────────────────

  return (
    <div className="page-stack">
      {/* Header row */}
      <div className="section-frame mb-5 flex flex-col gap-5 px-6 py-6 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <Breadcrumb />
          <p className="page-eyebrow mb-3 mt-4">Map discovery</p>
          <h1 className="text-4xl text-foreground">Buildings Map</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Browse buildings spatially, scan nearby options, and jump into the right space faster.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LocationControl
            permission={permission}
            onRequestLocation={requestLocation}
          />
          <Link
            href="/buildings"
            className="button-secondary px-4 py-2 text-sm font-medium"
          >
            List view
          </Link>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="section-frame flex h-[520px] gap-0 overflow-hidden rounded-[2rem]">
        {/* Sidebar list */}
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-border bg-[color:color-mix(in_srgb,var(--color-surface)_84%,white_16%)]">
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
    <nav className="flex items-center gap-2 text-sm text-text-soft">
      <Link href="/" className="hover:text-text-strong">
        Home
      </Link>
      <span>/</span>
      <Link href="/buildings" className="hover:text-text-strong">
        Buildings
      </Link>
      <span>/</span>
      <span className="font-medium text-foreground">Map</span>
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
        className="button-primary flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
      >
        <span aria-hidden>📍</span> Use my location
      </button>
    );
  }
  if (permission === "loading") {
    return <span className="text-sm text-text-soft">Locating…</span>;
  }
  if (permission === "granted") {
    return <span className="accent-pill text-sm font-medium">📍 Location active</span>;
  }
  // denied or unavailable
  return <span className="text-sm text-text-soft">Location unavailable</span>;
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
      <div className="p-5">
        <p className="text-sm text-danger">Failed to load buildings in this area.</p>
        <p className="mt-1 text-xs text-text-soft">Try moving the map or zooming out.</p>
      </div>
    );
  }

  if (!buildings || buildings.length === 0) {
    return (
      <div className="p-5">
        <p className="text-sm text-text-soft">
          {viewportBounds
            ? "No buildings in this area. Try zooming out."
            : "No buildings with location data available."}
        </p>
        <Link
          href="/buildings"
          className="mt-2 inline-block text-sm font-medium text-accent hover:text-text-strong"
        >
          Browse all buildings →
        </Link>
      </div>
    );
  }

  // buildings is non-null and non-empty at this point (guards above).
  return (
    <div className="divide-y divide-border">
      {(buildings as BuildingWithCoords[]).map((b) => (
        <div
          key={b.id}
          data-building-id={b.id}
          onClick={() => onSelect(b.id)}
            className={`cursor-pointer border-l-2 px-4 py-4 transition-colors ${
              b.id === selectedId
              ? "bg-blue-50 border-l-accent bg-[color:color-mix(in_srgb,var(--color-accent-muted)_58%,white_42%)]"
              : "border-l-transparent hover:bg-[color:color-mix(in_srgb,var(--color-accent-muted)_36%,white_64%)]"
            }`}
        >
          <p className="text-sm font-medium text-foreground">{b.name}</p>
          <p className="mt-0.5 truncate text-xs text-text-soft">{b.address}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewSpaces(b.id);
            }}
            className="mt-2 text-xs font-medium text-accent hover:text-text-strong"
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
    <div className="flex h-full items-center justify-center bg-[color:color-mix(in_srgb,var(--color-accent-muted)_42%,white_58%)]">
      <div className="text-center px-6">
        <p className="mb-2 text-sm text-text-muted">
          No buildings have location data yet.
        </p>
        <Link href="/buildings" className="text-sm font-medium text-accent hover:text-text-strong">
          Browse buildings by list →
        </Link>
      </div>
    </div>
  );
}
