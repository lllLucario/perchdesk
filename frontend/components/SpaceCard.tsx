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

const TYPE_VISUALS: Record<string, { gradient: string; emoji: string }> = {
  library: {
    gradient:
      "radial-gradient(circle at top, rgba(137,179,116,0.22), transparent 56%), linear-gradient(135deg, #f4f8f1, #e7eee1)",
    emoji: "📚",
  },
  office: {
    gradient:
      "radial-gradient(circle at top, rgba(116,155,179,0.22), transparent 56%), linear-gradient(135deg, #f1f5f8, #e1e8ee)",
    emoji: "💼",
  },
};

const DEFAULT_VISUAL = {
  gradient:
    "radial-gradient(circle at top, rgba(160,160,140,0.18), transparent 56%), linear-gradient(135deg, #f5f5f2, #eae9e4)",
  emoji: "🪑",
};

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

  const visual = TYPE_VISUALS[type] ?? DEFAULT_VISUAL;

  return (
    <div
      className="relative cursor-pointer rounded-[1.75rem] border border-[color:color-mix(in_srgb,var(--color-border)_22%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface)_98%,white_2%)] shadow-[0_1px_3px_rgba(22,26,22,0.06),0_4px_8px_-2px_rgba(22,26,22,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--color-accent)_20%,transparent)] hover:shadow-[0_2px_6px_rgba(22,26,22,0.08),0_8px_16px_-4px_rgba(22,26,22,0.10)]"
      onClick={() => router.push(`/spaces/${spaceId}`)}
    >
      {/* Visual placeholder header */}
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden rounded-t-[1.65rem]"
        style={{ background: visual.gradient }}
      >
        <span className="text-3xl">{visual.emoji}</span>
        {ribbon && (
          <div className="absolute bottom-2 left-0">
            {ribbon}
          </div>
        )}
      </div>

      {/* Favorite star */}
      <button
        aria-label={optimistic ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-3 top-3 p-0.5 text-white/70 transition-colors hover:text-accent"
        onClick={handleStarClick}
        disabled={toggleFavorite.isPending}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={optimistic ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={optimistic ? 0 : 1.5}
          className={`h-5 w-5 ${optimistic ? "text-accent" : ""}`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
          />
        </svg>
      </button>

      {/* Card content */}
      <div className="px-4 pt-3 pb-4">
        <p className="line-clamp-1 pr-6 font-serif text-xl leading-tight text-foreground">{name}</p>
        <p className="mt-1 text-xs capitalize text-text-muted">
          {type} · {capacity} seats
        </p>
        {buildingName && (
          <p className="mt-1 text-xs text-text-soft">{buildingName}</p>
        )}
        {supportingLine && (
          <p className="mt-2 inline-flex rounded-full bg-[color:color-mix(in_srgb,var(--color-accent-muted)_40%,white_60%)] px-2.5 py-1 text-[11px] font-semibold text-text-strong">
            {supportingLine}
          </p>
        )}
      </div>
    </div>
  );
}
