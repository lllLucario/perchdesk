"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BuildingWithCoords, BuildingsWithinBoundsParams } from "@/lib/hooks";

// Leaflet's default PNG icons don't resolve correctly in Next.js due to
// Webpack asset pipeline differences.  An inline SVG div-icon sidesteps
// the issue without requiring additional file-loader config.
function buildingMarkerIcon(selected: boolean) {
  const fill = selected ? "#2563EB" : "#DC2626";
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z" fill="${fill}"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
    </svg>`,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// Emits viewport bounds to the parent on map load, move, and zoom.
//
// Uses useMap() + manual Leaflet on/off instead of useMapEvents so that:
// 1. Event handlers are registered exactly once (on mount) and never
//    re-registered on re-renders — re-registration can fire the event
//    immediately causing a setState → re-render → re-register infinite loop.
// 2. onBoundsChange is kept in a ref updated via useEffect (not during render)
//    to satisfy React Compiler's "no ref access during render" rule while
//    still always calling the latest version of the callback.
// 3. Bounds are deduplicated so the callback is skipped when the viewport
//    has not actually changed (guards against flyTo / icon-update noise).
function ViewportTracker({
  onBoundsChange,
}: {
  onBoundsChange: (b: BuildingsWithinBoundsParams) => void;
}) {
  const map = useMap();
  const callbackRef = useRef(onBoundsChange);
  const lastBoundsKey = useRef<string>("");

  // Keep ref in sync with the latest prop value (inside useEffect, not render).
  useEffect(() => {
    callbackRef.current = onBoundsChange;
  });

  useEffect(() => {
    function emit() {
      const b = map.getBounds();
      const bounds: BuildingsWithinBoundsParams = {
        minLat: b.getSouth(),
        minLng: b.getWest(),
        maxLat: b.getNorth(),
        maxLng: b.getEast(),
      };
      const key = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
      if (key === lastBoundsKey.current) return;
      lastBoundsKey.current = key;
      callbackRef.current(bounds);
    }

    map.on("moveend", emit);
    map.on("zoomend", emit);
    // Emit initial bounds after the map finishes its first render.
    const id = setTimeout(emit, 150);

    return () => {
      map.off("moveend", emit);
      map.off("zoomend", emit);
      clearTimeout(id);
    };
  }, [map]);

  return null;
}

// Imperatively pans to the selected building when the selection changes.
function MapFlyTo({
  selectedId,
  buildings,
}: {
  selectedId: string | null;
  buildings: BuildingWithCoords[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const b = buildings.find((b) => b.id === selectedId);
    if (!b) return;
    map.flyTo([b.latitude, b.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.6,
    });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Recenters the map imperatively when the user's location coordinates arrive.
//
// react-leaflet's MapContainer.center is mount-only — updating the prop after
// the map has been created has no effect on the viewport.  This component uses
// useMap() to flyTo the new center whenever lat/lng change, mirroring the
// MapFlyTo pattern used for building selection.
//
// Primitive lat/lng values are used as the useEffect dependency instead of the
// center array to avoid a new reference on every render triggering the effect.
//
// The isFirstRender guard skips the initial mount so the map does not fly to
// the default Sydney coordinates redundantly (MapContainer already positions
// the map there on creation).  Subsequent center changes — i.e. the user
// grants location and coordinates become available — do trigger a fly-to.
function MapRecenterOnLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [lat, lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ─── Public component ─────────────────────────────────────────────────────────

interface Props {
  buildings: BuildingWithCoords[];
  selectedId: string | null;
  onSelectBuilding: (id: string) => void;
  onBoundsChange: (bounds: BuildingsWithinBoundsParams) => void;
  /** Map center as [lat, lng].  Defaults to Sydney, Australia. */
  center?: [number, number];
  zoom?: number;
}

export default function BuildingMap({
  buildings,
  selectedId,
  onSelectBuilding,
  onBoundsChange,
  center = [-33.87, 151.21],
  zoom = 11,
}: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ViewportTracker onBoundsChange={onBoundsChange} />
      <MapFlyTo selectedId={selectedId} buildings={buildings} />
      <MapRecenterOnLocation lat={center[0]} lng={center[1]} />
      {buildings.map((b) => (
        <Marker
          key={b.id}
          position={[b.latitude, b.longitude]}
          icon={buildingMarkerIcon(b.id === selectedId)}
          eventHandlers={{ click: () => onSelectBuilding(b.id) }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <p className="font-medium text-gray-900 text-sm">{b.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{b.address}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
