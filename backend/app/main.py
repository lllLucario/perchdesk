from contextlib import asynccontextmanager
from typing import AsyncIterator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as api_router
from app.core.exceptions import PerchDeskError
from app.scheduler.jobs import expire_unchecked_bookings

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    scheduler.add_job(expire_unchecked_bookings, "interval", minutes=1, id="auto_release")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="PerchDesk API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.exception_handler(PerchDeskError)
async def perchdesk_exception_handler(request: Request, exc: PerchDeskError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "message": exc.detail,
            "error": {"code": exc.error_code, "detail": exc.detail},
        },
    )


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}
