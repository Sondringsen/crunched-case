from fastapi import APIRouter

from app.routers import dogs

router = APIRouter()

router.include_router(dogs.router, prefix="/dogs", tags=["dogs"])
