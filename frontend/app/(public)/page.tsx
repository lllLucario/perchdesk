"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: spaces, isLoading } = useSpaces();
  const { data: buildingsData } = useBuildings();
  const { permission, coordinates, requestLocation } = useLocationStore();

  const nearbyParams =
    isAuthenticated && permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude, limit: 6 }
      : null;
  const { data: nearbyRecs, isLoading: nearbyLoading, isError: nearbyError } = useNearbySpaces(nearbyParams);
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: favoriteSpaces } = useFavoriteSpaces();
  const { data: recentVisits } = useRecentSpaceVisits(4);

  // Build space lookup for enriching favorite/visit IDs with card data
  const spacesById = new Map((spaces ?? []).map((s) => [s.id, s]));

  // Recent booking space IDs: deduplicated, ordered by created_at DESC
  const recentBookingSpaceIds = (() => {
    if (!bookings) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    const sorted = [...bookings].sort(
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

  const forYouLoading = bookingsLoading || (permission === "loading") ||
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search */}
      <div className="text-center py-14">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a building or space…"
            className="w-full px-5 py-3.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-sm"
            readOnly
          />
        </div>
        <p className="mt-3 text-xs text-gray-400">Browse below or search above</p>
      </div>

      {/* For You — mixed personalized stream, authenticated only */}
      {isAuthenticated && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              For You
            </h2>
            <Link href="/my-spaces" className="text-xs text-blue-600 hover:underline">
              See all
            </Link>
          </div>

          {forYouLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-40 h-32 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {forYouCards.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
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
                <div className={`${forYouCards.length > 0 ? "mt-3" : ""} bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between`}>
                  <p className="text-sm text-gray-500">Allow location access to see nearby spaces</p>
                  <button
                    onClick={requestLocation}
                    className="ml-4 text-sm text-blue-600 font-medium hover:underline flex-shrink-0"
                  >
                    Use my location
                  </button>
                </div>
              )}

              {(permission === "denied" || permission === "unavailable") && forYouCards.length === 0 && (
                <p className="text-sm text-gray-400">
                  Location unavailable.{" "}
                  <Link href="/buildings" className="text-blue-600 hover:underline">Browse buildings</Link>
                  {" "}instead.
                </p>
              )}

              {permission === "granted" && nearbyError && (
                <p className="text-sm text-red-400">
                  Could not load nearby spaces.{" "}
                  <Link href="/my-spaces" className="underline hover:text-red-500">
                    Try again
                  </Link>
                  .
                </p>
              )}

              {permission === "granted" && !nearbyError && forYouCards.length === 0 && (
                <p className="text-sm text-gray-400">No personalised spaces yet.</p>
              )}
            </>
          )}
        </section>
      )}

      {/* Recent Spaces */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Spaces
        </h2>
        {!isAuthenticated ? (
          <div className="bg-white border border-gray-100 rounded-xl px-5 py-6 text-center">
            <p className="text-sm text-gray-400 mb-3">Sign in to see your recently used spaces</p>
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentSpaces.length === 0 ? (
          <p className="text-sm text-gray-400">No spaces found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentSpaces.map((space) => (
              <Link
                key={space.id}
                href={`/spaces/${space.id}`}
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{space.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {space.type} · {space.capacity} seats
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Nearby / All Buildings */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          {isNearbyLocation ? "Nearby Buildings" : "Buildings"}
        </h2>
        {isNearbyLocation && nearbyBuildingsError ? (
          <p className="text-sm text-gray-400">
            Could not load nearby buildings.{" "}
            <Link href="/buildings" className="text-blue-600 hover:underline">
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
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {buildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className="block bg-white border border-gray-100 rounded-xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 text-sm">{building.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{building.address}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
