import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.seat import (
    SeatAvailabilityResponse,
    SeatBatchCreate,
    SeatCreate,
    SeatResponse,
    SeatUpdate,
)
from app.services import seat as seat_service

router = APIRouter(tags=["seats"])


@router.get("/spaces/{space_id}/seats", response_model=list[SeatResponse])
async def list_seats(
    space_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return await seat_service.list_seats(db, space_id)


@router.post("/spaces/{space_id}/seats", response_model=SeatResponse, status_code=201)
async def create_seat(
    space_id: uuid.UUID,
    data: SeatCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    return await seat_service.create_seat(db, space_id, data)


@router.post("/spaces/{space_id}/seats/batch", response_model=list[SeatResponse], status_code=201)
async def batch_create_seats(
    space_id: uuid.UUID,
    data: SeatBatchCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    return await seat_service.batch_create_seats(db, space_id, data)


@router.get("/spaces/{space_id}/availability", response_model=list[SeatAvailabilityResponse])
async def get_availability(
    space_id: uuid.UUID,
    start: datetime = Query(...),
    end: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return await seat_service.get_availability(db, space_id, start, end)


@router.put("/seats/{seat_id}", response_model=SeatResponse)
async def update_seat(
    seat_id: uuid.UUID,
    data: SeatUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> object:
    return await seat_service.update_seat(db, seat_id, data)


@router.delete("/seats/{seat_id}", status_code=204)
async def delete_seat(
    seat_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    await seat_service.delete_seat(db, seat_id)
