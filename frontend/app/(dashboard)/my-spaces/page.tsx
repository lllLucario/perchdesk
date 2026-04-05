"use client";

import Link from "next/link";
import { useLocationStore } from "@/store/locationStore";
import {
  useNearbySpaces,
  useFavoriteSpaces,
  useSpaces,
  useBookings,
  useRecentSpaceVisits,
  type Space,
} from "@/lib/hooks";
import RecommendationRibbon from "@/components/RecommendationRibbon";
import SpaceCard from "@/components/SpaceCard";


// ─── Recommended Spaces section ──────────────────────────────────────────────

function RecommendedSection() {
  const { permission, coordinates, requestLocation } = useLocationStore();

  const nearbyParams =
    permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude, limit: 8 }
      : null;

  const { data: recommendations, isLoading, isError } = useNearbySpaces(nearbyParams);

  if (permission === "idle") {
    return (
      <div className="bg-white border border-gray-100 rounded-xl px-5 py-6 text-center">
        <p className="text-sm text-gray-500 mb-3">
          Allow location access to see spaces near you
        </p>
        <button
          onClick={requestLocation}
          className="text-sm text-blue-600 font-medium hover:underline"
        >
          Use my location
        </button>
      </div>
    );
  }

  if (permission === "loading") {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-gray-400">
        Location access was denied. You can still browse spaces via{" "}
        <Link href="/buildings" className="text-blue-600 hover:underline">
          Buildings
        </Link>
        .
      </p>
    );
  }

  if (permission === "unavailable") {
    return (
      <p className="text-sm text-gray-400">
        Location is unavailable on this device. Browse spaces via{" "}
        <Link href="/buildings" className="text-blue-600 hover:underline">
          Buildings
        </Link>
        .
      </p>
    );
  }

  // granted
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-400">
        Could not load nearby spaces. Check your connection and{" "}
        <button onClick={() => window.location.reload()} className="underline hover:text-red-500">
          try again
        </button>
        , or{" "}
        <Link href="/buildings" className="underline hover:text-red-500">
          browse buildings
        </Link>
        .
      </p>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No nearby spaces found. Try{" "}
        <Link href="/buildings" className="text-blue-600 hover:underline">
          browsing buildings
        </Link>{" "}
        instead.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {recommendations.map((rec) => (
        <SpaceCard
          key={rec.space_id}
          spaceId={rec.space_id}
          name={rec.space_name}
          type={rec.space_type}
          capacity={rec.capacity}
          buildingName={rec.building_name}
          isFavorited={rec.is_favorited}
          ribbon={<RecommendationRibbon reason={rec.reason} />}
          supportingLine={`${rec.distance_km} km away`}
        />
      ))}
    </div>
  );
}

// ─── Favorite Spaces section ────────────────────────────────────────────────

function FavoriteSection({ spacesById }: { spacesById: Map<string, Space> }) {
  const { data: favorites, isLoading } = useFavoriteSpaces();

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const favoriteSpaces = (favorites ?? [])
    .map((f) => spacesById.get(f.space_id))
    .filter((s): s is Space => s !== undefined);

  if (favoriteSpaces.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No favorite spaces yet. Tap the star on any space card to save it here.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {favoriteSpaces.map((space) => (
        <div key={space.id} className="w-44 flex-shrink-0">
          <SpaceCard
            spaceId={space.id}
            name={space.name}
            type={space.type}
            capacity={space.capacity}
            isFavorited={true}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Recent Spaces section ──────────────────────────────────────────────────

interface RecentCard {
  spaceId: string;
  space: Space;
  supportingLine: string;
}

function RecentSection({ spacesById }: { spacesById: Map<string, Space> }) {
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const { data: visits, isLoading: visitsLoading } = useRecentSpaceVisits(4);

  const isLoading = bookingsLoading || visitsLoading;

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Build deduplicated recent list: bookings first, then floorplan visits
  const seen = new Set<string>();
  const cards: RecentCard[] = [];

  // Recent bookings — deduplicated, newest first
  const sortedBookings = [...(bookings ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const b of sortedBookings) {
    if (seen.has(b.space_id)) continue;
    const space = spacesById.get(b.space_id);
    if (!space) continue;
    seen.add(b.space_id);
    cards.push({ spaceId: b.space_id, space, supportingLine: "Booked recently" });
  }

  // Recent floorplan visits — fill remaining
  for (const v of visits ?? []) {
    if (seen.has(v.space_id)) continue;
    const space = spacesById.get(v.space_id);
    if (!space) continue;
    seen.add(v.space_id);
    cards.push({ spaceId: v.space_id, space, supportingLine: "Visited recently" });
  }

  if (cards.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No recent activity yet. Book a space or visit a floorplan to see it here.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {cards.map((card) => (
        <div key={card.spaceId} className="w-44 flex-shrink-0">
          <SpaceCard
            spaceId={card.spaceId}
            name={card.space.name}
            type={card.space.type}
            capacity={card.space.capacity}
            isFavorited={card.space.is_favorited}
            supportingLine={card.supportingLine}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MySpacesPage() {
  const { data: spaces, isLoading: spacesLoading } = useSpaces();
  const spacesById = new Map((spaces ?? []).map((s) => [s.id, s]));

  return (
    <div>
      {/* Header */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">My Spaces</span>
      </nav>

      <h1 className="text-xl font-semibold text-gray-900">My Spaces</h1>
      <p className="text-sm text-gray-400 mt-1 mb-8">
        Personalized access to spaces you use most
      </p>

      {/* Favorite Spaces */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Favorite Spaces
        </h2>
        {spacesLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <FavoriteSection spacesById={spacesById} />
        )}
      </section>

      {/* Recent Spaces */}
      <section className="mb-10">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recent Spaces
        </h2>
        {spacesLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="w-44 h-36 flex-shrink-0 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <RecentSection spacesById={spacesById} />
        )}
      </section>

      {/* Recommended Spaces */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Recommended Spaces
        </h2>
        <RecommendedSection />
      </section>
    </div>
  );
}
