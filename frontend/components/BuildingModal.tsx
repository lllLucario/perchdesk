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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,26,22,0.48)]"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_24px_56px_rgba(22,26,22,0.16)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero placeholder */}
        <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(140,173,130,0.35),_transparent_58%),linear-gradient(135deg,_#edf3e8,_#dbe5d3)]">
          <span className="text-4xl">🏛</span>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(247,250,244,0.92)] text-text-soft shadow-[0_0_0_1px_var(--color-border)] hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="mb-1 font-serif text-2xl leading-tight text-foreground">{building.name}</h2>
          <p className="mb-4 text-sm text-text-muted">{building.address}</p>

          {building.description && (
            <p className="mb-4 text-sm text-text-muted">{building.description}</p>
          )}

          {(building.opening_hours || spaceCount !== undefined) && (
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              {building.opening_hours && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-text-soft">Opening Hours</p>
                  {Object.entries(building.opening_hours).map(([k, v]) => (
                    <p key={k} className="capitalize text-text-strong">
                      {k}: {v}
                    </p>
                  ))}
                </div>
              )}
              {spaceCount !== undefined && (
                <div>
                  <p className="mb-1 text-xs uppercase tracking-[0.14em] text-text-soft">Spaces</p>
                  <p className="text-text-strong">{spaceCount} spaces</p>
                </div>
              )}
            </div>
          )}

          {building.facilities && building.facilities.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-text-soft">Facilities</p>
              <div className="flex flex-wrap gap-1.5">
                {building.facilities.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-text-strong shadow-[0_0_0_1px_var(--color-border)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleViewSpaces}
            className="button-primary w-full py-2.5 text-sm font-medium"
          >
            View Spaces →
          </button>
        </div>
      </div>
    </div>
  );
}
