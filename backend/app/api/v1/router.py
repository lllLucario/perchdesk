from fastapi import APIRouter

from app.api.v1 import auth, bookings, buildings, seats, spaces

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(buildings.router)
router.include_router(spaces.router)
router.include_router(seats.router)
router.include_router(bookings.router)
