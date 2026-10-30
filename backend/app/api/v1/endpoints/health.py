"""
Health-check endpoint for Recall API.
"""

from datetime import datetime, timezone

from fastapi import APIRouter

from backend.app.database.connection import check_db_connection
from backend.app.schemas.file import HealthResponse

router = APIRouter(tags=["health"])

API_VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return the current health status of the API and its dependencies."""
    db_ok = check_db_connection()

    return HealthResponse(
        status="healthy" if db_ok else "unhealthy",
        version=API_VERSION,
        database=db_ok,
        timestamp=datetime.now(timezone.utc),
    )
