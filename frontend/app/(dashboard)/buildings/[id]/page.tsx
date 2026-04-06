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
  const breadcrumbClass = "mb-6 flex items-center gap-2 text-sm text-text-soft";
  const crumbLinkClass = "hover:text-text-strong";

  if (isLoading) {
    return (
      <div>
        <nav className={breadcrumbClass}>
          <Link href="/" className={crumbLinkClass}>Home</Link>
          <span>/</span>
          <Link href="/buildings" className={crumbLinkClass}>Buildings</Link>
          <span>/</span>
          <span className="text-text-soft">Loading…</span>
        </nav>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-[1.75rem] bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <nav className={breadcrumbClass}>
          <Link href="/" className={crumbLinkClass}>Home</Link>
          <span>/</span>
          <Link href="/buildings" className={crumbLinkClass}>Buildings</Link>
        </nav>
        <p className="text-sm text-danger">Failed to load spaces for this building.</p>
      </div>
    );
  }

  return (
    <div>
      <nav className={breadcrumbClass}>
        <Link href="/" className={crumbLinkClass}>Home</Link>
        <span>/</span>
        <Link href="/buildings" className={crumbLinkClass}>Buildings</Link>
        <span>/</span>
        <span className="font-medium text-foreground">{buildingName}</span>
      </nav>

      <h1 className="mb-1 text-4xl text-foreground">
        Spaces in {buildingName}
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        Choose a space to start booking
      </p>

      {spaces && spaces.length === 0 ? (
        <p className="text-sm text-text-soft">No spaces available in this building.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces?.map((space) => (
            <div
              key={space.id}
              className="panel-surface overflow-hidden rounded-[1.75rem] transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft"
            >
              {/* Card body — click to open modal */}
              <button
                className="w-full text-left px-5 pt-5 pb-3"
                onClick={() => setSelectedSpace(space)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="pr-3 font-serif text-2xl leading-tight text-foreground">{space.name}</p>
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-strong capitalize">
                    {space.type}
                  </span>
                </div>
                <p className="text-sm text-text-muted">{space.capacity} seats</p>
                {space.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-text-soft">{space.description}</p>
                )}
              </button>

              {/* CTA — enter floorplan */}
              <div className="px-5 pb-4">
                <button
                  onClick={() => router.push(`/spaces/${space.id}`)}
                  className="button-primary w-full py-2 text-sm font-medium"
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
