"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSpaces, useBuildings, useNearbyBuildings, useBookings, useNearbySpaces } from "@/lib/hooks";
import { useAuthStore } from "@/store/authStore";
import { useLocationStore } from "@/store/locationStore";
import RecommendationRibbon from "@/components/RecommendationRibbon";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { data: spaces, isLoading } = useSpaces();
  const { data: buildingsData } = useBuildings();
  const { permission, coordinates, requestLocation } = useLocationStore();

  const nearbyParams =
    isAuthenticated && permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude, limit: 4 }
      : null;
  const { data: nearbyRecs, isLoading: nearbyLoading, isError: nearbyError } = useNearbySpaces(nearbyParams);
  const { data: bookings, isLoading: bookingsLoading } = useBookings();

  // Recent spaces: deduplicated by space_id, sorted by created_at DESC (most recently
  // booked first), up to 2. Sorting by created_at rather than start_time ensures that
  // future bookings with a distant start_time don't displace genuinely recent activity.
  const recentForYou = (() => {
    if (!bookings) return [];
    const seen = new Set<string>();
    const result: typeof bookings = [];
    const sorted = [...bookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    for (const b of sorted) {
      if (!seen.has(b.space_id)) {
        seen.add(b.space_id);
        result.push(b);
        if (result.length === 2) break;
      }
    }
    return result;
  })();

  // Recommended spaces: exclude any already shown as recent.
  const recentSpaceIds = new Set(recentForYou.map((b) => b.space_id));
  const recsForYou = (nearbyRecs ?? []).filter((r) => !recentSpaceIds.has(r.space_id)).slice(0, 4);

  const forYouLoading = bookingsLoading || (permission === "loading") ||
    (permission === "granted" && nearbyLoading);

  const recentSpaces = spaces?.slice(0, 4) ?? [];

  // Nearby buildings: use location-aware query when coordinates are available,
  // otherwise fall back to the generic building list.
  const nearbyBuildingsParams =
    permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude }
      : null;
  const { data: nearbyBuildingsData } = useNearbyBuildings(
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

      {/* For You — location-aware recommendations, authenticated only */}
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
              {/* Mixed stream: recents + recommendations */}
              {(recentForYou.length > 0 || recsForYou.length > 0) && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {/* Recent cards */}
                  {recentForYou.map((b) => (
                    <div
                      key={b.space_id}
                      className="w-40 flex-shrink-0 bg-white border border-gray-100 rounded-xl px-3 py-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/spaces/${b.space_id}`)}
                    >
                      <p className="font-medium text-gray-900 text-sm line-clamp-1">{b.space_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{b.building_name ?? "—"}</p>
                      <p className="text-xs text-gray-400 mt-2">Booked recently</p>
                    </div>
                  ))}

                  {/* Recommended cards */}
                  {recsForYou.map((rec) => (
                    <div
                      key={rec.space_id}
                      className="w-40 flex-shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/spaces/${rec.space_id}`)}
                    >
                      <div className="px-3 pt-3 pb-1">
                        <RecommendationRibbon reason={rec.reason} />
                      </div>
                      <div className="px-3 pb-3">
                        <p className="font-medium text-gray-900 text-sm mt-1 line-clamp-1">{rec.space_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          {rec.space_type} · {rec.capacity} seats
                        </p>
                        <p className="text-xs text-blue-500 mt-1">{rec.distance_km} km away</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Location nudge when idle or denied/unavailable */}
              {permission === "idle" && (
                <div className={`${recentForYou.length > 0 ? "mt-3" : ""} bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between`}>
                  <p className="text-sm text-gray-500">Allow location access to see nearby spaces</p>
                  <button
                    onClick={requestLocation}
                    className="ml-4 text-sm text-blue-600 font-medium hover:underline flex-shrink-0"
                  >
                    Use my location
                  </button>
                </div>
              )}

              {(permission === "denied" || permission === "unavailable") && recentForYou.length === 0 && (
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

              {permission === "granted" && !nearbyError && recentForYou.length === 0 && recsForYou.length === 0 && (
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
        {buildings.length === 0 ? (
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
