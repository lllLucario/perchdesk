"use client";

import Link from "next/link";
import { useSpaces } from "@/lib/hooks";

export default function SpacesPage() {
  const { data: spaces, isLoading, error } = useSpaces();
  const breadcrumbClass = "mb-6 flex items-center gap-2 text-sm text-text-soft";

  if (isLoading) return <p className="text-text-muted">Loading spaces…</p>;
  if (error) return <p className="text-danger">Failed to load spaces.</p>;

  return (
    <div>
      <nav className={breadcrumbClass}>
        <Link href="/" className="hover:text-text-strong">Home</Link>
        <span>/</span>
        <span className="font-medium text-foreground">Spaces</span>
      </nav>
      <div className="mb-6">
          <h1 className="font-serif text-4xl text-foreground">Available Spaces</h1>
        <p className="mt-2 text-sm text-text-muted">
          A quieter list view for spaces across the network.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {spaces?.map((space) => (
          <Link
            key={space.id}
            href={`/spaces/${space.id}`}
            className="panel-surface rounded-[1.7rem] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="pr-3 font-serif text-2xl leading-tight text-foreground">{space.name}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  space.type === "library"
                    ? "bg-surface-muted text-text-strong"
                    : "bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,white_80%)] text-accent"
                }`}
              >
                {space.type === "library" ? "Library" : "Office"}
              </span>
            </div>
            <p className="text-sm text-text-muted">{space.capacity} seats</p>
          </Link>
        ))}
        {spaces?.length === 0 && (
          <p className="col-span-full text-text-muted">No spaces available.</p>
        )}
      </div>
    </div>
  );
}
