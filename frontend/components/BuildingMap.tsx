"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
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
function ViewportTracker({
  onBoundsChange,
}: {
  onBoundsChange: (b: BuildingsWithinBoundsParams) => void;
}) {
  function emit(m: L.Map) {
    const b = m.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  }

  const map = useMapEvents({
    moveend: () => emit(map),
    zoomend: () => emit(map),
  });

  // Emit initial bounds once the map container has finished its first render.
  useEffect(() => {
    const id = setTimeout(() => emit(map), 150);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
