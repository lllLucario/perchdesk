"use client";

import React from "react";
import { useRouter } from "next/navigation";

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
  ribbon,
  supportingLine,
}: SpaceCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl px-4 py-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/spaces/${spaceId}`)}
    >
      {ribbon && <div className="mb-2">{ribbon}</div>}
      <p className="font-medium text-gray-900 text-sm line-clamp-1">{name}</p>
      <p className="text-xs text-gray-400 mt-0.5 capitalize">
        {type} · {capacity} seats
      </p>
      {buildingName && (
        <p className="text-xs text-gray-400 mt-0.5">{buildingName}</p>
      )}
      {supportingLine && (
        <p className="text-xs text-blue-500 mt-1">{supportingLine}</p>
      )}
    </div>
  );
}
