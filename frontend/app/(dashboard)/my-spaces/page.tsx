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
  const helperLinkClass = "text-accent hover:text-text-strong";

  const nearbyParams =
    permission === "granted" && coordinates !== null
      ? { lat: coordinates.latitude, lng: coordinates.longitude, limit: 8 }
      : null;

  const { data: recommendations, isLoading, isError } = useNearbySpaces(nearbyParams);

  if (permission === "idle") {
    return (
      <div className="panel-surface rounded-[1.7rem] px-5 py-6 text-center">
        <p className="mb-3 text-sm text-text-muted">
          Allow location access to see spaces near you
        </p>
        <button
          onClick={requestLocation}
          className="button-secondary px-4 py-2 text-sm font-medium"
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
          <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <p className="text-sm text-text-soft">
        Location access was denied. You can still browse spaces via{" "}
        <Link href="/buildings" className={helperLinkClass}>
          Buildings
        </Link>
        .
      </p>
    );
  }

  if (permission === "unavailable") {
    return (
      <p className="text-sm text-text-soft">
        Location is unavailable on this device. Browse spaces via{" "}
        <Link href="/buildings" className={helperLinkClass}>
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
          <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-danger">
        Could not load nearby spaces. Check your connection and{" "}
        <button onClick={() => window.location.reload()} className="underline">
          try again
        </button>
        , or{" "}
        <Link href="/buildings" className="underline">
          browse buildings
        </Link>
        .
      </p>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="text-sm text-text-soft">
        No nearby spaces found. Try{" "}
        <Link href="/buildings" className={helperLinkClass}>
          browsing buildings
        </Link>{" "}
        instead.
      </p>
    );
  }

  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 py-4 -my-4">
      {recommendations.map((rec) => (
        <div key={rec.space_id} className="w-44 flex-shrink-0">
          <SpaceCard
            spaceId={rec.space_id}
            name={rec.space_name}
            type={rec.space_type}
            capacity={rec.capacity}
            buildingName={rec.building_name}
            isFavorited={rec.is_favorited}
            ribbon={<RecommendationRibbon reason={rec.reason} />}
            supportingLine={`${rec.distance_km} km away`}
          />
        </div>
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
          <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
        ))}
      </div>
    );
  }

  const favoriteSpaces = (favorites ?? [])
    .map((f) => spacesById.get(f.space_id))
    .filter((s): s is Space => s !== undefined);

  if (favoriteSpaces.length === 0) {
    return (
      <p className="text-sm text-text-soft">
        No favorite spaces yet. Tap the star on any space card to save it here.
      </p>
    );
  }

  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 py-4 -my-4">
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
          <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
        ))}
      </div>
    );
  }

  // Build deduplicated recent list: bookings first, then floorplan visits
  const seen = new Set<string>();
  const cards: RecentCard[] = [];

  // Recent bookings — active/successful only, deduplicated, newest first
  const activeStatuses = new Set(["confirmed", "checked_in"]);
  const sortedBookings = [...(bookings ?? [])]
    .filter((b) => activeStatuses.has(b.status))
    .sort(
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
      <p className="text-sm text-text-soft">
        No recent activity yet. Book a space or visit a floorplan to see it here.
      </p>
    );
  }

  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 py-4 -my-4">
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
  const breadcrumbClass = "mb-6 flex items-center gap-2 text-sm text-text-soft";
  const sectionTitleClass = "section-kicker mb-4";

  return (
    <div className="page-stack">
      {/* Header */}
      <nav className={breadcrumbClass}>
        <Link href="/" className="hover:text-text-strong">Home</Link>
        <span>/</span>
        <span className="font-medium text-foreground">My Spaces</span>
      </nav>

      <div className="mb-6 rounded-[2rem] px-2 py-2 md:px-3">
        <p className="page-eyebrow mb-3">Personalized access</p>
        <h1 className="text-4xl text-foreground">My Spaces</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">
          Personalized access to spaces you use most
        </p>
      </div>

      {/* Favorite Spaces */}
      <section className="mb-8 px-1 pt-3 md:px-0">
        <h2 className={sectionTitleClass}>
          Favorite Spaces
        </h2>
        {spacesLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
            ))}
          </div>
        ) : (
          <FavoriteSection spacesById={spacesById} />
        )}
      </section>

      {/* Recent Spaces */}
      <section className="mb-8 px-1 pt-3 md:px-0">
        <h2 className={sectionTitleClass}>
          Recent Spaces
        </h2>
        {spacesLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-36 w-44 flex-shrink-0 animate-pulse rounded-[1.6rem] bg-surface-muted" />
            ))}
          </div>
        ) : (
          <RecentSection spacesById={spacesById} />
        )}
      </section>

      {/* Recommended Spaces */}
      <section className="px-1 pt-3 md:px-0">
        <h2 className={sectionTitleClass}>
          Recommended Spaces
        </h2>
        <RecommendedSection />
      </section>
    </div>
  );
}
