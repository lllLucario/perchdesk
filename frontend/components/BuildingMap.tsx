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

// On initial load, ensures at least the nearest building is visible in the
// viewport.  If no building markers fall within the current bounds, the map
// zooms out from the current center (user location) until the nearest building
// is visible, with buffer so the marker is not pinned to the edge.
//
// The center stays on the user's position so they retain directional context.
function AutoFitNearestBuilding({
  buildings,
}: {
  buildings: BuildingWithCoords[];
}) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (hasFitted.current || buildings.length === 0) return;

    // Wait a tick for the map to settle after mount.
    const id = setTimeout(() => {
      const bounds = map.getBounds();
      const anyVisible = buildings.some((b) =>
        bounds.contains([b.latitude, b.longitude])
      );
      if (anyVisible) {
        hasFitted.current = true;
        return;
      }

      // Find nearest building to map center.
      const center = map.getCenter();
      let nearest = buildings[0];
      let minDist = Infinity;
      for (const b of buildings) {
        const dist = center.distanceTo(L.latLng(b.latitude, b.longitude));
        if (dist < minDist) {
          minDist = dist;
          nearest = b;
        }
      }

      // Zoom out from current center until the nearest building is visible.
      // fitBounds would shift the center to the midpoint — instead we find the
      // right zoom level that keeps center fixed and the building within view.
      const nearestLatLng = L.latLng(nearest.latitude, nearest.longitude);
      let targetZoom = map.getZoom();
      const minZoom = map.getMinZoom();

      while (targetZoom > minZoom) {
        targetZoom -= 1;
        // Compute what the bounds would be at this zoom level, centered on
        // the current center.  getBoundsAtZoom is not a Leaflet API, so we
        // project manually: get the pixel position of the building at the
        // candidate zoom, check if it falls within the container with buffer.
        const containerSize = map.getSize();
        const buffer = 60; // px buffer from edge
        const centerPx = map.project(center, targetZoom);
        const buildingPx = map.project(nearestLatLng, targetZoom);
        const dx = Math.abs(buildingPx.x - centerPx.x);
        const dy = Math.abs(buildingPx.y - centerPx.y);
        if (dx < containerSize.x / 2 - buffer && dy < containerSize.y / 2 - buffer) {
          break;
        }
      }

      map.setView(center, targetZoom, { animate: true });
      hasFitted.current = true;
    }, 200);

    return () => clearTimeout(id);
  }, [buildings, map]);

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
      <AutoFitNearestBuilding buildings={buildings} />
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
