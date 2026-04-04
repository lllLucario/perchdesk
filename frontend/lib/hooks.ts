import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ----- Types -----

export interface Building {
  id: string;
  name: string;
  address: string;
  description: string | null;
  opening_hours: Record<string, string> | null;
  facilities: string[] | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

/** A building that has coordinates confirmed present (non-nullable). */
export interface BuildingWithCoords extends Omit<Building, "latitude" | "longitude"> {
  latitude: number;
  longitude: number;
}

/** Shape returned by GET /api/v1/buildings/nearby */
export interface BuildingNearbyResult extends BuildingWithCoords {
  distance_km: number;
}

export interface BuildingsWithinBoundsParams {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface Space {
  id: string;
  building_id: string | null;
  name: string;
  type: string;
  description: string | null;
  capacity: number;
  layout_config: Record<string, unknown> | null;
  created_at: string;
  is_favorited: boolean;
}

export interface Seat {
  id: string;
  space_id: string;
  label: string;
  position: { x: number; y: number };
  status: string;
  attributes: Record<string, unknown> | null;
}

/** Full detail shape returned by GET /spaces/:id — includes embedded seats */
export interface SpaceDetail extends Space {
  seats: Seat[];
}

export interface Booking {
  id: string;
  user_id: string;
  seat_id: string;
  start_time: string;
  end_time: string;
  status: string;
  checked_in_at: string | null;
  created_at: string;
  // Enriched context fields from backend
  seat_label: string;
  seat_position: { x: number; y: number };
  space_id: string;
  space_name: string;
  space_layout_config: Record<string, unknown> | null;
  building_id: string | null;
  building_name: string | null;
}

export interface SpaceRules {
  id: string;
  space_id: string;
  max_duration_minutes: number;
  max_advance_days: number;
  time_unit: "hourly" | "half_day" | "full_day";
  auto_release_minutes: number | null;
  requires_approval: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export interface SeatAvailability extends Seat {
  booking_status: "available" | "booked" | "my_booking";
}

/** Shape returned by GET /api/v1/spaces/nearby */
export interface SpaceRecommendationResult {
  space_id: string;
  space_name: string;
  space_type: string;
  capacity: number;
  building_id: string;
  building_name: string;
  building_address: string;
  building_latitude: number;
  building_longitude: number;
  distance_km: number;
  reason: "near_you" | "closest_available";
  available_seat_count: number;
  is_favorited: boolean;
}

// ----- Nearby spaces recommendation -----

export interface NearbySpacesParams {
  lat: number;
  lng: number;
  startTime?: string;
  endTime?: string;
  type?: "library" | "office";
  limit?: number;
}

export function useNearbySpaces(params: NearbySpacesParams | null) {
  return useQuery<SpaceRecommendationResult[]>({
    queryKey: ["spaces", "nearby", params],
    queryFn: () => {
      if (!params) return Promise.resolve([]);
      const qs = new URLSearchParams({
        lat: String(params.lat),
        lng: String(params.lng),
        ...(params.startTime ? { start_time: params.startTime } : {}),
        ...(params.endTime ? { end_time: params.endTime } : {}),
        ...(params.type ? { type: params.type } : {}),
        ...(params.limit != null ? { limit: String(params.limit) } : {}),
      });
      return api.get<SpaceRecommendationResult[]>(`/api/v1/spaces/nearby?${qs}`);
    },
    enabled: params !== null,
  });
}

// ----- Buildings -----

export function useBuildings() {
  return useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: () => api.get<Building[]>("/api/v1/buildings"),
  });
}

export function useBuildingsWithinBounds(params: BuildingsWithinBoundsParams | null) {
  return useQuery<BuildingWithCoords[]>({
    queryKey: ["buildings", "within-bounds", params],
    queryFn: () => {
      if (!params) return Promise.resolve([]);
      const qs = new URLSearchParams({
        min_lat: String(params.minLat),
        min_lng: String(params.minLng),
        max_lat: String(params.maxLat),
        max_lng: String(params.maxLng),
      });
      return api.get<BuildingWithCoords[]>(`/api/v1/buildings/within-bounds?${qs}`);
    },
    enabled: params !== null,
    staleTime: 10_000,
  });
}

export function useNearbyBuildings(lat: number | null, lng: number | null, limit = 20) {
  return useQuery<BuildingNearbyResult[]>({
    queryKey: ["buildings", "nearby", lat, lng, limit],
    queryFn: () => {
      const qs = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        limit: String(limit),
      });
      return api.get<BuildingNearbyResult[]>(`/api/v1/buildings/nearby?${qs}`);
    },
    enabled: lat !== null && lng !== null,
  });
}

export function useBuilding(id: string | null) {
  return useQuery<Building>({
    queryKey: ["buildings", id],
    queryFn: () => api.get<Building>(`/api/v1/buildings/${id}`),
    enabled: !!id,
  });
}

export function useBuildingSpaces(buildingId: string | null) {
  return useQuery<Space[]>({
    queryKey: ["buildings", buildingId, "spaces"],
    queryFn: () => api.get<Space[]>(`/api/v1/buildings/${buildingId}/spaces`),
    enabled: !!buildingId,
  });
}

// ----- Auth -----

export function useCurrentUser() {
  return useQuery<UserProfile>({
    queryKey: ["me"],
    queryFn: () => api.get<UserProfile>("/api/v1/auth/me"),
    retry: false,
  });
}

// ----- Spaces -----

export function useSpaces() {
  return useQuery<Space[]>({
    queryKey: ["spaces"],
    queryFn: () => api.get<Space[]>("/api/v1/spaces"),
  });
}

export function useSpace(id: string) {
  return useQuery<SpaceDetail>({
    queryKey: ["spaces", id],
    queryFn: () => api.get<SpaceDetail>(`/api/v1/spaces/${id}`),
    enabled: !!id,
  });
}

export function useSpaceRules(spaceId: string) {
  return useQuery<SpaceRules>({
    queryKey: ["spaces", spaceId, "rules"],
    queryFn: () => api.get<SpaceRules>(`/api/v1/spaces/${spaceId}/rules`),
    enabled: !!spaceId,
  });
}

// ----- Bookings -----

export function useBookings() {
  return useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/v1/bookings"),
    // Re-fetch every minute so UX statuses derived from the current time
    // (Booked → Check-in Available, In Use → Completed) stay up to date
    // without requiring a full page reload.
    refetchInterval: 60_000,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { seat_id: string; start_time: string; end_time: string }) =>
      api.post<Booking>("/api/v1/bookings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.patch<Booking>(`/api/v1/bookings/${bookingId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      api.patch<Booking>(`/api/v1/bookings/${bookingId}/check-in`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// ----- Seat availability (time-range based) -----

export function useSpaceAvailability(spaceId: string, start: string, end: string) {
  return useQuery<SeatAvailability[]>({
    queryKey: ["spaces", spaceId, "availability", start, end],
    queryFn: () =>
      api.get<SeatAvailability[]>(
        `/api/v1/spaces/${spaceId}/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      ),
    enabled: !!spaceId && !!start && !!end,
  });
}

// ----- Seat mutations -----

export function useAddSeat(spaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { label: string; position: { x: number; y: number } }) =>
      api.post<Seat>(`/api/v1/spaces/${spaceId}/seats`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces", spaceId] });
    },
  });
}

export function useDeleteSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ seatId, spaceId }: { seatId: string; spaceId: string }) =>
      api.delete<void>(`/api/v1/seats/${seatId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.spaceId] });
    },
  });
}

export function useUpdateSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      seatId,
      spaceId,
      data,
    }: {
      seatId: string;
      spaceId: string;
      data: { label?: string; status?: string; attributes?: Record<string, unknown> };
    }) => api.put<Seat>(`/api/v1/seats/${seatId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.spaceId] });
    },
  });
}

// ----- Space mutations -----

export function useCreateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; capacity: number }) =>
      api.post<Space>("/api/v1/spaces", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useUpdateSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spaceId,
      data,
    }: {
      spaceId: string;
      data: { name?: string; capacity?: number; layout_config?: Record<string, unknown> };
    }) => api.put<Space>(`/api/v1/spaces/${spaceId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => api.delete<void>(`/api/v1/spaces/${spaceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useUploadFloorPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, file }: { spaceId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api.upload<Space>(`/api/v1/spaces/${spaceId}/floor-plan`, form);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", variables.spaceId] });
    },
  });
}

export function useDeleteFloorPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: string) => api.delete<Space>(`/api/v1/spaces/${spaceId}/floor-plan`),
    onSuccess: (_data, spaceId) => {
      queryClient.invalidateQueries({ queryKey: ["spaces", spaceId] });
    },
  });
}
