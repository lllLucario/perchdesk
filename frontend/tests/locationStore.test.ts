/**
 * Tests for useLocationStore — browser location permission and acquisition.
 */
import { useLocationStore } from "@/store/locationStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockGetCurrentPosition = jest.fn();

function fakePosition(lat: number, lng: number, accuracy = 15): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

function fakeError(code: number): GeolocationPositionError {
  return {
    code,
    message: "test error",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store to initial state before each test
  useLocationStore.setState({ permission: "idle", coordinates: null, acquiredAt: null });

  // Install mock geolocation on navigator
  Object.defineProperty(global.navigator, "geolocation", {
    value: { getCurrentPosition: mockGetCurrentPosition },
    writable: true,
    configurable: true,
  });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe("initial state", () => {
  test("permission is idle", () => {
    expect(useLocationStore.getState().permission).toBe("idle");
  });

  test("coordinates are null", () => {
    expect(useLocationStore.getState().coordinates).toBeNull();
  });

  test("acquiredAt is null", () => {
    expect(useLocationStore.getState().acquiredAt).toBeNull();
  });
});

// ─── requestLocation ──────────────────────────────────────────────────────────

describe("requestLocation", () => {
  test("transitions to loading synchronously before callback fires", () => {
    mockGetCurrentPosition.mockImplementation(() => {
      // hold — do not invoke any callback
    });

    useLocationStore.getState().requestLocation();

    expect(useLocationStore.getState().permission).toBe("loading");
  });

  test("transitions to granted with coordinates on success", () => {
    const position = fakePosition(-33.8688, 151.2093, 10);
    mockGetCurrentPosition.mockImplementation(
      (onSuccess: PositionCallback) => onSuccess(position)
    );

    useLocationStore.getState().requestLocation();

    const state = useLocationStore.getState();
    expect(state.permission).toBe("granted");
    expect(state.coordinates?.latitude).toBeCloseTo(-33.8688);
    expect(state.coordinates?.longitude).toBeCloseTo(151.2093);
    expect(state.coordinates?.accuracy).toBe(10);
  });

  test("sets acquiredAt on success", () => {
    const before = Date.now();
    mockGetCurrentPosition.mockImplementation(
      (onSuccess: PositionCallback) => onSuccess(fakePosition(0, 0))
    );

    useLocationStore.getState().requestLocation();

    const { acquiredAt } = useLocationStore.getState();
    expect(acquiredAt).not.toBeNull();
    expect(acquiredAt!).toBeGreaterThanOrEqual(before);
  });

  test("transitions to denied on PERMISSION_DENIED error", () => {
    const error = fakeError(1 /* PERMISSION_DENIED */);
    mockGetCurrentPosition.mockImplementation(
      (_: PositionCallback, onError: PositionErrorCallback) => onError(error)
    );

    useLocationStore.getState().requestLocation();

    expect(useLocationStore.getState().permission).toBe("denied");
    expect(useLocationStore.getState().coordinates).toBeNull();
  });

  test("transitions to unavailable on POSITION_UNAVAILABLE error", () => {
    const error = fakeError(2 /* POSITION_UNAVAILABLE */);
    mockGetCurrentPosition.mockImplementation(
      (_: PositionCallback, onError: PositionErrorCallback) => onError(error)
    );

    useLocationStore.getState().requestLocation();

    expect(useLocationStore.getState().permission).toBe("unavailable");
    expect(useLocationStore.getState().coordinates).toBeNull();
  });

  test("transitions to unavailable on TIMEOUT error", () => {
    const error = fakeError(3 /* TIMEOUT */);
    mockGetCurrentPosition.mockImplementation(
      (_: PositionCallback, onError: PositionErrorCallback) => onError(error)
    );

    useLocationStore.getState().requestLocation();

    expect(useLocationStore.getState().permission).toBe("unavailable");
  });

  test("sets unavailable when navigator.geolocation is not supported", () => {
    Object.defineProperty(global.navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    useLocationStore.getState().requestLocation();

    expect(useLocationStore.getState().permission).toBe("unavailable");
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
  });

  test("retains previous coordinates while permission returns to loading on re-request", () => {
    // First successful grant
    mockGetCurrentPosition.mockImplementation(
      (onSuccess: PositionCallback) => onSuccess(fakePosition(-33.8688, 151.2093))
    );
    useLocationStore.getState().requestLocation();
    expect(useLocationStore.getState().permission).toBe("granted");

    // Second request is in-flight — permission goes back to loading
    mockGetCurrentPosition.mockImplementation(() => {
      // hold — callback not yet fired
    });
    useLocationStore.getState().requestLocation();

    // Previous coordinates are retained while the new request is in-flight
    expect(useLocationStore.getState().permission).toBe("loading");
    expect(useLocationStore.getState().coordinates?.latitude).toBeCloseTo(-33.8688);
  });
});

// ─── clearLocation ────────────────────────────────────────────────────────────

describe("clearLocation", () => {
  test("resets permission to idle", () => {
    useLocationStore.setState({ permission: "denied", coordinates: null, acquiredAt: null });
    useLocationStore.getState().clearLocation();
    expect(useLocationStore.getState().permission).toBe("idle");
  });

  test("clears coordinates", () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: -33.8688, longitude: 151.2093, accuracy: 10 },
      acquiredAt: Date.now(),
    });
    useLocationStore.getState().clearLocation();
    expect(useLocationStore.getState().coordinates).toBeNull();
  });

  test("clears acquiredAt", () => {
    useLocationStore.setState({
      permission: "granted",
      coordinates: { latitude: 0, longitude: 0, accuracy: null },
      acquiredAt: Date.now(),
    });
    useLocationStore.getState().clearLocation();
    expect(useLocationStore.getState().acquiredAt).toBeNull();
  });

  test("works from unavailable state", () => {
    useLocationStore.setState({ permission: "unavailable", coordinates: null, acquiredAt: null });
    useLocationStore.getState().clearLocation();
    expect(useLocationStore.getState().permission).toBe("idle");
  });
});
