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
  const breadcrumbClass = "mb-6 flex items-center gap-2 text-sm text-text-soft";
  const crumbLinkClass = "hover:text-text-strong";

  if (isLoading) {
    return (
      <div className="page-stack">
        <nav className={breadcrumbClass}>
          <Link href="/" className={crumbLinkClass}>Home</Link>
          <span>/</span>
          <span className="font-medium text-foreground">Buildings</span>
        </nav>
        <h1 className="mb-6 text-4xl text-foreground">Buildings</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-[1.75rem] bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-stack">
        <nav className={breadcrumbClass}>
          <Link href="/" className={crumbLinkClass}>Home</Link>
          <span>/</span>
          <span className="font-medium text-foreground">Buildings</span>
        </nav>
        <p className="text-sm text-danger">Failed to load buildings.</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <nav className={breadcrumbClass}>
        <Link href="/" className={crumbLinkClass}>Home</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Buildings</span>
      </nav>

      <div className="mb-6 flex flex-col gap-4 rounded-[2rem] px-2 py-2 md:flex-row md:items-end md:justify-between md:px-3">
        <div>
          <p className="page-eyebrow mb-3">Browse buildings</p>
          <h1 className="text-4xl text-foreground">Buildings</h1>
          <p className="mt-2 text-sm text-text-muted">
            Browse the places where PerchDesk can guide you into rooms, desks, and quiet corners.
          </p>
        </div>
        <Link
          href="/buildings/map"
          className="button-secondary flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
        >
          <span aria-hidden>🗺</span> Map view
        </Link>
      </div>

      {buildings && buildings.length === 0 ? (
        <p className="text-sm text-text-soft">No buildings available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings?.map((building) => (
            <div
              key={building.id}
              className="panel-surface overflow-hidden rounded-[1.75rem] transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft"
            >
              {/* Card body — click to open modal */}
              <button
                className="w-full text-left"
                onClick={() => setSelectedBuilding(building)}
              >
                <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(137,179,116,0.22),_transparent_56%),linear-gradient(135deg,_#f4f8f1,_#e7eee1)]">
                  <span className="text-3xl">🏛</span>
                </div>
                <div className="px-5 pt-4 pb-3">
                  <p className="font-serif text-2xl leading-tight text-foreground">{building.name}</p>
                  <p className="mt-1 text-sm text-text-muted">{building.address}</p>
                </div>
              </button>

              {/* CTA — click to enter building flow */}
              <div className="px-5 pb-4">
                <button
                  onClick={() => router.push(`/buildings/${building.id}`)}
                  className="button-primary w-full py-2 text-sm font-medium"
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
