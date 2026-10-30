"""
File management endpoints for Recall API.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.schemas.file import FileCreate, FileResponse, FileListResponse
from backend.app.services.file_service import (
    create_file,
    get_files,
    process_file_background,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=FileListResponse)
async def list_files(
    file_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> FileListResponse:
    """
    List indexed files with optional filtering by type.

    Query params:
        file_type – filter by 'image', 'pdf', 'note', or 'document'
        skip      – pagination offset (default 0)
        limit     – page size (default 50, max 200)
    """
    limit = min(limit, 200)
    files, total = get_files(db, file_type=file_type, skip=skip, limit=limit)
    return FileListResponse(files=files, total=total)


@router.post("", response_model=FileResponse, status_code=201)
async def create_file_record(
    file_data: FileCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> FileResponse:
    """
    Create a new file record and enqueue content extraction.

    The actual OCR / PDF processing runs as a background task so
    this endpoint returns immediately.
    """
    try:
        db_file = create_file(db, file_data)
    except Exception as exc:
        logger.exception("Failed to create file record")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Kick off extraction in the background with independent session
    background_tasks.add_task(process_file_background, db_file.id)

    return FileResponse.model_validate(db_file)
