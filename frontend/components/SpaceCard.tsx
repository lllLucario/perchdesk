"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useToggleFavoriteSpace } from "@/lib/hooks";

/**
 * SpaceCard — standard space card used across browsing and discovery surfaces.
 *
 * Contextual additions (ribbon, supportingLine) are optional so the same
 * component works in plain browsing lists, personalized surfaces, and
 * location-aware recommendation feeds.
 */

interface SpaceCardProps {
  spaceId: string;
  name: string;
  type: string;
  capacity: number;
  buildingName?: string | null;
  /** Whether the current user has favorited this space. */
  isFavorited?: boolean;
  /** Optional ribbon badge placed above the name (e.g. RecommendationRibbon). */
  ribbon?: React.ReactNode;
  /** Optional single supporting line (e.g. "0.1 km away", "Booked recently"). */
  supportingLine?: string;
}

export default function SpaceCard({
  spaceId,
  name,
  type,
  capacity,
  buildingName,
  isFavorited = false,
  ribbon,
  supportingLine,
}: SpaceCardProps) {
  const router = useRouter();
  const toggleFavorite = useToggleFavoriteSpace();

  // Optimistic local state: flips immediately on click, syncs back to
  // server-backed prop when it changes (e.g. after query refetch).
  const [optimistic, setOptimistic] = React.useState(isFavorited);
  React.useEffect(() => {
    setOptimistic(isFavorited);
  }, [isFavorited]);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !optimistic;
    setOptimistic(next);
    toggleFavorite.mutate(
      { spaceId, favorited: optimistic },
      { onError: () => setOptimistic(optimistic) },
    );
  };

  return (
    <div
      className="panel-surface relative cursor-pointer rounded-3xl px-4 py-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft hover:shadow-[0_18px_40px_rgba(22,26,22,0.09)]"
      onClick={() => router.push(`/spaces/${spaceId}`)}
    >
      {/* Favorite star */}
      <button
        aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-3 top-3 rounded-full p-1 text-text-soft transition-colors hover:text-accent"
        onClick={handleStarClick}
        disabled={toggleFavorite.isPending}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={optimistic ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={optimistic ? 0 : 1.5}
          className={`h-4 w-4 ${optimistic ? "text-accent" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      </button>

      {ribbon && <div className="mb-2">{ribbon}</div>}
      <p className="line-clamp-1 pr-6 font-serif text-lg leading-tight text-foreground">{name}</p>
      <p className="mt-1 text-xs capitalize text-text-muted">
        {type} · {capacity} seats
      </p>
      {buildingName && (
        <p className="mt-0.5 text-xs text-text-soft">{buildingName}</p>
      )}
      {supportingLine && (
        <p className="mt-2 text-xs font-medium text-accent">{supportingLine}</p>
      )}
    </div>
  );
}
