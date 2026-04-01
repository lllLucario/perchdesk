"""Unit tests for app.core.geo utilities."""
import math

import pytest

from app.core.geo import haversine_km


class TestHaversineKm:
    def test_same_point_is_zero(self) -> None:
        assert haversine_km(0.0, 0.0, 0.0, 0.0) == pytest.approx(0.0)

    def test_known_distance_sydney_to_melbourne(self) -> None:
        # Straight-line distance is approximately 714 km.
        d = haversine_km(-33.8688, 151.2093, -37.8136, 144.9631)
        assert d == pytest.approx(714.0, abs=5.0)

    def test_symmetric(self) -> None:
        d1 = haversine_km(-33.8688, 151.2093, -37.8136, 144.9631)
        d2 = haversine_km(-37.8136, 144.9631, -33.8688, 151.2093)
        assert d1 == pytest.approx(d2)

    def test_result_is_non_negative(self) -> None:
        assert haversine_km(10.0, 20.0, -10.0, -20.0) >= 0.0

    def test_poles_distance(self) -> None:
        # North Pole to South Pole is half the Earth's circumference ≈ 20 015 km.
        d = haversine_km(90.0, 0.0, -90.0, 0.0)
        assert d == pytest.approx(math.pi * 6371.0, abs=1.0)

    def test_equatorial_degree_is_roughly_111km(self) -> None:
        # One degree of longitude along the equator ≈ 111.3 km.
        d = haversine_km(0.0, 0.0, 0.0, 1.0)
        assert d == pytest.approx(111.3, abs=0.5)
