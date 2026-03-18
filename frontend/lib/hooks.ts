import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ----- Types -----

export interface Space {
  id: string;
  name: string;
  type: string;
  capacity: number;
  layout_config: Record<string, unknown> | null;
  created_at: string;
}

export interface Seat {
  id: string;
  space_id: string;
  label: string;
  position: { x: number; y: number };
  status: string;
  attributes: Record<string, unknown> | null;
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
  return useQuery<Space>({
    queryKey: ["spaces", id],
    queryFn: () => api.get<Space>(`/api/v1/spaces/${id}`),
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
