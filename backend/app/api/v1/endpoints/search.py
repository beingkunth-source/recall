"""
Search endpoint for Recall API.

Uses the local search service to rank filename + extracted-content matches.
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.schemas.file import SearchResponse, SearchResult
from backend.app.services.search_service import quick_search

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    file_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> SearchResponse:
    """Search filenames and extracted content with relevance ranking."""
    started = time.perf_counter()
    limit = min(max(limit, 1), 100)
    hits, total = quick_search(db, q, file_type=file_type, limit=skip + limit)
    page = hits[skip : skip + limit]

    results = [
        SearchResult(
            file_id=h.file_id,
            filename=h.filename,
            file_type=h.file_type,
            content_snippet=h.content_snippet,
            content_type=h.content_type,
            page_number=h.page_number,
            confidence=h.confidence,
            local_path=h.local_path,
            score=h.score,
            updated_at=h.updated_at,
        )
        for h in page
    ]

    took_ms = (time.perf_counter() - started) * 1000
    return SearchResponse(results=results, total=total, query=q, took_ms=round(took_ms, 2))


@router.get("/quick", response_model=SearchResponse)
async def search_quick(
    q: str = Query(..., min_length=1, description="Quick search query"),
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db),
) -> SearchResponse:
    """Spotlight-style quick search — top ranked hits only."""
    started = time.perf_counter()
    hits, total = quick_search(db, q, limit=limit)
    results = [
        SearchResult(
            file_id=h.file_id,
            filename=h.filename,
            file_type=h.file_type,
            content_snippet=h.content_snippet,
            content_type=h.content_type,
            page_number=h.page_number,
            confidence=h.confidence,
            local_path=h.local_path,
            score=h.score,
            updated_at=h.updated_at,
        )
        for h in hits
    ]
    took_ms = (time.perf_counter() - started) * 1000
    return SearchResponse(results=results, total=total, query=q, took_ms=round(took_ms, 2))
