import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse
from app.services import booking as booking_service

router = APIRouter(tags=["bookings"])


@router.get("/bookings", response_model=list[BookingResponse])
async def list_my_bookings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return await booking_service.list_my_bookings(db, current_user.id)


@router.post("/bookings", response_model=BookingResponse, status_code=201)
async def create_booking(
    data: BookingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    return await booking_service.create_booking(db, current_user.id, data)


@router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    return await booking_service.get_booking(db, booking_id, current_user.id)


@router.patch("/bookings/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    return await booking_service.cancel_booking(db, booking_id, current_user.id)


@router.patch("/bookings/{booking_id}/check-in", response_model=BookingResponse)
async def check_in(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    return await booking_service.check_in(db, booking_id, current_user.id)


@router.get("/admin/bookings", response_model=list[BookingResponse])
async def list_all_bookings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list:
    return await booking_service.list_all_bookings(db)
