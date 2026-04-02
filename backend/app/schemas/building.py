import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


def _validate_lat(v: float | None) -> float | None:
    if v is not None and not (-90.0 <= v <= 90.0):
        raise ValueError("latitude must be between -90 and 90")
    return v


def _validate_lon(v: float | None) -> float | None:
    if v is not None and not (-180.0 <= v <= 180.0):
        raise ValueError("longitude must be between -180 and 180")
    return v


class BuildingCreate(BaseModel):
    name: str
    address: str
    description: str | None = None
    opening_hours: dict[str, Any] | None = None
    facilities: list[Any] | None = None
    latitude: float | None = None
    longitude: float | None = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float | None) -> float | None:
        return _validate_lat(v)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float | None) -> float | None:
        return _validate_lon(v)

    @model_validator(mode="after")
    def validate_coordinate_pair(self) -> "BuildingCreate":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "latitude and longitude must both be provided or both be null"
            )
        return self


class BuildingUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    description: str | None = None
    opening_hours: dict[str, Any] | None = None
    facilities: list[Any] | None = None
    latitude: float | None = None
    longitude: float | None = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float | None) -> float | None:
        return _validate_lat(v)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float | None) -> float | None:
        return _validate_lon(v)

    @model_validator(mode="after")
    def validate_coordinate_pair(self) -> "BuildingUpdate":
        lat_set = "latitude" in self.model_fields_set
        lon_set = "longitude" in self.model_fields_set
        if lat_set != lon_set:
            raise ValueError(
                "latitude and longitude must both be provided or both be omitted"
            )
        if lat_set and (self.latitude is None) != (self.longitude is None):
            raise ValueError(
                "latitude and longitude must both be provided or both be null"
            )
        return self


class BuildingResponse(BaseModel):
    id: uuid.UUID
    name: str
    address: str
    description: str | None
    opening_hours: dict[str, Any] | None
    facilities: list[Any] | None
    latitude: float | None
    longitude: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BuildingNearbyResult(BaseModel):
    """A building returned from a nearby query, with distance context.

    Only buildings that have coordinates are ever returned by this endpoint,
    so latitude and longitude are non-nullable here.
    distance_km is rounded to three decimal places (~1 m precision).
    """

    id: uuid.UUID
    name: str
    address: str
    description: str | None
    opening_hours: dict[str, Any] | None
    facilities: list[Any] | None
    latitude: float
    longitude: float
    created_at: datetime
    distance_km: float


class BuildingBoundsResult(BaseModel):
    """A building returned from a viewport/bounding-box query.

    Only buildings that have coordinates are ever returned by this endpoint,
    so latitude and longitude are non-nullable here.  Unlike BuildingNearbyResult
    there is no user reference point, so no distance is included.
    """

    id: uuid.UUID
    name: str
    address: str
    description: str | None
    opening_hours: dict[str, Any] | None
    facilities: list[Any] | None
    latitude: float
    longitude: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
