"""Lightweight geographic utility functions.

Application-level calculations only — no database extension required.
Contracts are designed to stay compatible with future PostGIS migration.
"""

import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in kilometres between two points.

    Uses the Haversine formula with an Earth radius of 6 371 km.
    Input coordinates must be in decimal degrees.
    """
    r = 6_371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
