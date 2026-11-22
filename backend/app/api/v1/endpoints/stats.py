"""
Statistics endpoint for Recall API.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.file import File
from backend.app.schemas.file import StatsResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Return aggregate statistics about indexed files in a single optimized query."""
    row = db.query(
        func.count(File.id).label("total_files"),
        func.coalesce(func.sum(case((File.file_type == "image", 1), else_=0)), 0).label("images"),
        func.coalesce(func.sum(case((File.file_type == "pdf", 1), else_=0)), 0).label("pdfs"),
        func.coalesce(func.sum(case((File.file_type == "note", 1), else_=0)), 0).label("notes"),
        func.coalesce(func.sum(case((File.indexing_status == "completed", 1), else_=0)), 0).label("indexed"),
        func.coalesce(func.sum(File.file_size), 0).label("storage_used"),
    ).first()

    total_files = int(row.total_files if row else 0)
    images = int(row.images if row else 0)
    pdfs = int(row.pdfs if row else 0)
    notes = int(row.notes if row else 0)
    indexed = int(row.indexed if row else 0)
    storage_used = int(row.storage_used if row else 0)

    return StatsResponse(
        total_files=total_files,
        total_images=images,
        total_pdfs=pdfs,
        total_notes=notes,
        total_indexed=indexed,
        storage_used=storage_used,
        images=images,
        pdfs=pdfs,
        notes=notes,
    )
