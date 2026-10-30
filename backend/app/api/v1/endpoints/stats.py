"""
Statistics endpoint for Recall API.
"""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.file import File
from backend.app.schemas.file import StatsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Return aggregate statistics about indexed files."""
    total_files = db.query(func.count(File.id)).scalar() or 0

    total_images = (
        db.query(func.count(File.id)).filter(File.file_type == "image").scalar() or 0
    )
    total_pdfs = (
        db.query(func.count(File.id)).filter(File.file_type == "pdf").scalar() or 0
    )
    total_notes = (
        db.query(func.count(File.id)).filter(File.file_type == "note").scalar() or 0
    )
    total_indexed = (
        db.query(func.count(File.id))
        .filter(File.indexing_status == "completed")
        .scalar()
        or 0
    )
    storage_used = db.query(func.sum(File.file_size)).scalar() or 0

    return StatsResponse(
        total_files=total_files,
        total_images=total_images,
        total_pdfs=total_pdfs,
        total_notes=total_notes,
        total_indexed=total_indexed,
        storage_used=int(storage_used),
        images=total_images,
        pdfs=total_pdfs,
        notes=total_notes,
    )
