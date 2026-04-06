"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  useSpaces,
  useBuildings,
  useNearbyBuildings,
  useBookings,
  useNearbySpaces,
  useFavoriteSpaces,
  useRecentSpaceVisits,
  type Space,
} from "@/lib/hooks";
import { useAuthStore } from "@/store/authStore";
import { useLocationStore } from "@/store/locationStore";
import RecommendationRibbon from "@/components/RecommendationRibbon";
import SpaceCard from "@/components/SpaceCard";

// ─── For You mixed-stream logic ─────────────────────────────────────────────

interface ForYouCard {
  spaceId: string;
  name: string;
  type: string;
  capacity: number;
  buildingName?: string | null;
  isFavorited: boolean;
  supportingLine?: string;
  ribbon?: React.ReactNode;
}

/**
 * Build a deduplicated mixed stream of favorite, recent, and recommended
 * spaces.  Each space appears at most once.  Priority order:
 * 1. Favorite spaces (up to 2)
 * 2. Recent spaces — bookings then floorplan visits (up to 2)
 * 3. Recommended spaces — nearby (remaining slots up to 6 total)
 */
function buildForYouStream({
  favoriteSpaceIds,
  recentBookingSpaceIds,
  recentVisitSpaceIds,
  spacesById,
  recommendations,
}: {
  favoriteSpaceIds: string[];
  recentBookingSpaceIds: string[];
  recentVisitSpaceIds: string[];
  spacesById: Map<string, Space>;
  recommendations: Array<{
    space_id: string;
    space_name: string;
    space_type: string;
    capacity: number;
    building_name: string;
    distance_km: number;
    reason: "near_you" | "closest_available";
    is_favorited: boolean;
  }>;
}): ForYouCard[] {
  const seen = new Set<string>();
  const cards: ForYouCard[] = [];

  // 1. Favorites (up to 2)
  for (const spaceId of favoriteSpaceIds) {
    if (seen.has(spaceId) || cards.length >= 2) break;
    const space = spacesById.get(spaceId);
    if (!space) continue;
    seen.add(spaceId);
    cards.push({
      spaceId,
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      isFavorited: true,
      supportingLine: "Favorite",
    });
  }

  // 2. Recent bookings (up to 2 total recents including visits)
  const recentCount = () => cards.length - favoriteSpaceIds.filter((id) => seen.has(id)).length;
  const maxRecent = 2;

  for (const spaceId of recentBookingSpaceIds) {
    if (seen.has(spaceId) || recentCount() >= maxRecent) break;
    const space = spacesById.get(spaceId);
    if (!space) continue;
    seen.add(spaceId);
    cards.push({
      spaceId,
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      isFavorited: space.is_favorited,
      supportingLine: "Booked recently",
    });
  }

  // Recent visits (fill remaining recent slots)
  for (const spaceId of recentVisitSpaceIds) {
    if (seen.has(spaceId) || recentCount() >= maxRecent) break;
    const space = spacesById.get(spaceId);
    if (!space) continue;
    seen.add(spaceId);
    cards.push({
      spaceId,
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      isFavorited: space.is_favorited,
      supportingLine: "Visited recently",
    });
  }

  // 3. Recommendations (fill up to 6 total)
  for (const rec of recommendations) {
    if (seen.has(rec.space_id) || cards.length >= 6) break;
    seen.add(rec.space_id);
    cards.push({
      spaceId: rec.space_id,
      name: rec.space_name,
      type: rec.space_type,
      capacity: rec.capacity,
      buildingName: rec.building_name,
      isFavorited: rec.is_favorited,
      ribbon: <RecommendationRibbon reason={rec.reason} />,
      supportingLine: `${rec.distance_km} km away`,
    });
  }

  return cards;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const { data: buildingsData } = useBuildings();
  const { permission, coordinates, requestLocation } = useLocationStore();

  // Auto-request location on first authenticated visit so nearby features
  // light up without requiring a manual click.
  useEffect(() => {
    if (isAuthenticated && permission === "idle") {
      requestLocation();
    }
  }, [isAuthenticated, permission, requestLocation]);

  const nearbyParams =
    isAuthenticated && permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude, limit: 6 }
      : null;
  const { data: nearbyRecs, isLoading: nearbyLoading, isError: nearbyError } = useNearbySpaces(nearbyParams);
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: favoriteSpaces, isLoading: favoritesLoading } = useFavoriteSpaces();
  const { data: recentVisits, isLoading: visitsLoading } = useRecentSpaceVisits(4);

  // Build space lookup for enriching favorite/visit IDs with card data
  const spacesById = new Map((spaces ?? []).map((s) => [s.id, s]));

  // Recent booking space IDs: deduplicated, ordered by created_at DESC
  const recentBookingSpaceIds = (() => {
    if (!bookings) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    const activeStatuses = new Set(["confirmed", "checked_in"]);
    const sorted = [...bookings]
      .filter((b) => activeStatuses.has(b.status))
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    for (const b of sorted) {
      if (!seen.has(b.space_id)) {
        seen.add(b.space_id);
        ids.push(b.space_id);
        if (ids.length === 2) break;
      }
    }
    return ids;
  })();

  const favoriteSpaceIds = (favoriteSpaces ?? []).map((f) => f.space_id);
  const recentVisitSpaceIds = (recentVisits ?? []).map((v) => v.space_id);

  const forYouCards = buildForYouStream({
    favoriteSpaceIds,
    recentBookingSpaceIds,
    recentVisitSpaceIds,
    spacesById,
    recommendations: nearbyRecs ?? [],
  });

  const forYouLoading = spacesLoading || bookingsLoading || favoritesLoading ||
    visitsLoading || (permission === "loading") ||
    (permission === "granted" && nearbyLoading);

  const recentSpaces = spaces?.slice(0, 4) ?? [];

  // Nearby buildings: use location-aware query when coordinates are available,
  // otherwise fall back to the generic building list.
  const nearbyBuildingsParams =
    permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude }
      : null;
  const {
    data: nearbyBuildingsData,
    isError: nearbyBuildingsError,
  } = useNearbyBuildings(
    nearbyBuildingsParams?.lat ?? null,
    nearbyBuildingsParams?.lng ?? null,
    4
  );
  const isNearbyLocation = permission === "granted" && coordinates !== null;
  const buildings = isNearbyLocation
    ? (nearbyBuildingsData ?? [])
    : (buildingsData?.slice(0, 4) ?? []);
  const compactCardClass = "panel-surface block rounded-[1.6rem] px-5 py-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent-soft";
  const sectionTitleClass = "section-kicker";
  const sectionLinkClass = "text-sm font-medium text-accent hover:text-text-strong";

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-8 text-center md:px-10 md:py-12">
        <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-accent">
          Find your next seat
        </p>
        <h1 className="text-5xl leading-[0.95] text-foreground md:text-7xl">
          Quiet booking for focused spaces.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-text-muted md:text-lg">
          Browse buildings, save favorites, and find the right room or desk without the usual
          dashboard clutter.
        </p>
        <div className="relative mx-auto mt-8 max-w-2xl">
          <input
            type="text"
            placeholder="Search for a building or space…"
            className="w-full rounded-[1.4rem] border border-border bg-surface px-5 py-4 text-sm text-foreground placeholder:text-text-soft shadow-[0_18px_40px_rgba(22,26,22,0.05)] focus:outline-none focus:ring-2 focus:ring-accent"
            readOnly
          />
        </div>
        <p className="mt-3 text-xs text-text-soft">Browse below or search above</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span className="accent-pill text-xs font-medium">Editorial calm</span>
          <span className="accent-pill text-xs font-medium">Green-first booking</span>
          <span className="accent-pill text-xs font-medium">Desk and room discovery</span>
        </div>
        </div>
      </section>

      {/* For You — mixed personalized stream, authenticated only */}
      {isAuthenticated && (
        <section className="mt-8 mb-10 px-1 pt-3 md:px-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className={sectionTitleClass}>
              For You
            </h2>
            <Link href="/my-spaces" className={sectionLinkClass}>
              See all
            </Link>
          </div>

          {forYouLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 w-40 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
              ))}
            </div>
          ) : (
            <>
              {forYouCards.length > 0 && (
                <div className="-mx-2 flex gap-3 overflow-x-auto px-2 py-4 -my-4">
                  {forYouCards.map((card) => (
                    <div key={card.spaceId} className="w-40 flex-shrink-0">
                      <SpaceCard
                        spaceId={card.spaceId}
                        name={card.name}
                        type={card.type}
                        capacity={card.capacity}
                        buildingName={card.buildingName}
                        isFavorited={card.isFavorited}
                        ribbon={card.ribbon}
                        supportingLine={card.supportingLine}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Location nudge when idle or denied/unavailable */}
              {permission === "idle" && (
                <div className={`${forYouCards.length > 0 ? "mt-3" : ""} panel-surface flex items-center justify-between rounded-[1.6rem] px-5 py-4`}>
                  <p className="text-sm text-text-muted">Allow location access to see nearby spaces</p>
                  <button
                    onClick={requestLocation}
                    className="button-secondary ml-4 flex-shrink-0 px-4 py-2 text-sm font-medium"
                  >
                    Use my location
                  </button>
                </div>
              )}

              {(permission === "denied" || permission === "unavailable") && forYouCards.length === 0 && (
                <p className="text-sm text-text-soft">
                  Location unavailable.{" "}
                  <Link href="/buildings" className={sectionLinkClass}>Browse buildings</Link>
                  {" "}instead.
                </p>
              )}

              {permission === "granted" && nearbyError && (
                <p className="text-sm text-danger">
                  Could not load nearby spaces.{" "}
                  <Link href="/my-spaces" className="underline">
                    Try again
                  </Link>
                  .
                </p>
              )}

              {permission === "granted" && !nearbyError && forYouCards.length === 0 && (
                <p className="text-sm text-text-soft">No personalised spaces yet.</p>
              )}
            </>
          )}
        </section>
      )}

      {/* Recent Spaces */}
      <section className="mb-10 px-1 pt-3 md:px-0">
        <h2 className={`${sectionTitleClass} mb-4`}>
          Recent Spaces
        </h2>
        {!isAuthenticated ? (
          <div className="panel-surface rounded-[1.7rem] px-5 py-6 text-center">
            <p className="mb-3 text-sm text-text-soft">Sign in to see your recently used spaces</p>
            <Link
              href="/login"
              className={sectionLinkClass}
            >
              Sign in
            </Link>
          </div>
        ) : spacesLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-[1.5rem] bg-surface-muted" />
            ))}
          </div>
        ) : recentSpaces.length === 0 ? (
          <p className="text-sm text-text-soft">No spaces found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentSpaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${space.id}`}
                className={compactCardClass}
              >
                <p className="font-serif text-lg leading-tight text-foreground">{space.name}</p>
                <p className="mt-1 text-xs capitalize text-text-muted">
                  {space.type} · {space.capacity} seats
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Nearby / All Buildings */}
      <section className="px-1 pt-3 md:px-0">
        <h2 className={`${sectionTitleClass} mb-4`}>
          {isNearbyLocation ? "Nearby Buildings" : "Buildings"}
        </h2>
        {isNearbyLocation && nearbyBuildingsError ? (
          <p className="text-sm text-text-soft">
            Could not load nearby buildings.{" "}
            <Link href="/buildings" className={sectionLinkClass}>
              Browse all buildings
            </Link>
            .
          </p>
        ) : buildings.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Central Library", address: "123 Main Street" },
              { name: "Tech Hub", address: "456 Innovation Ave" },
              { name: "Business Centre", address: "789 Commerce Rd" },
              { name: "Creative Quarter", address: "321 Arts Lane" },
            ].map((b) => (
              <Link
                key={b.name}
                href="/buildings"
                className={compactCardClass}
              >
                <p className="font-serif text-lg leading-tight text-foreground">{b.name}</p>
                <p className="mt-1 text-xs text-text-muted">{b.address}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {buildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className={compactCardClass}
              >
                <p className="font-serif text-lg leading-tight text-foreground">{building.name}</p>
                <p className="mt-1 text-xs text-text-muted">{building.address}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
