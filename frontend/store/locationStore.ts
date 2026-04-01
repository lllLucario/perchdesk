import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Lifecycle states for browser location permission and acquisition.
 *
 * - `idle`        — location has not been requested yet this session
 * - `loading`     — request is in progress
 * - `granted`     — coordinates successfully acquired
 * - `denied`      — user explicitly denied the permission prompt
 * - `unavailable` — browser does not support geolocation, or the device
 *                   could not determine position (timeout, hardware error)
 */
export type LocationPermission = "idle" | "loading" | "granted" | "denied" | "unavailable";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface LocationState {
  permission: LocationPermission;
  /** Null until a successful acquisition. */
  coordinates: Coordinates | null;
  /** Unix timestamp (ms) of the most recent successful acquisition, or null. */
  acquiredAt: number | null;

  /**
   * Request the device's current position.
   *
   * Must be called from an intentional user action — never triggered
   * automatically on page load.
   */
  requestLocation: () => void;

  /**
   * Reset location state back to idle.
   *
   * Allows a surface to offer a "try again" path after denial or error.
   */
  clearLocation: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useLocationStore = create<LocationState>()((set) => ({
  permission: "idle",
  coordinates: null,
  acquiredAt: null,

  requestLocation: () => {
    if (!navigator.geolocation) {
      set({ permission: "unavailable" });
      return;
    }

    set({ permission: "loading" });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        set({
          permission: "granted",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          acquiredAt: Date.now(),
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          set({ permission: "denied", coordinates: null });
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT both surface as "unavailable"
          set({ permission: "unavailable", coordinates: null });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  },

  clearLocation: () =>
    set({ permission: "idle", coordinates: null, acquiredAt: null }),
}));
