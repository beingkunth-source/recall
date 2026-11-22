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
from backend.app.services.local_ai_service import parse_user_intent, safe_calculate

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
    """Spotlight-style quick search — top ranked hits with Local AI intent handling."""
    started = time.perf_counter()
    results: list[SearchResult] = []

    # 1. Local AI Intent Analysis
    intent = parse_user_intent(q)
    if intent and intent.intent_type == "calc":
        results.append(
            SearchResult(
                file_id="local-ai-calc",
                filename=intent.title,
                file_type="calc",
                content_snippet=intent.description,
                content_type="ai",
                page_number=None,
                confidence=intent.confidence,
                local_path=f"calc://{intent.action_data['display']}",
                score=100.0,
                updated_at=None,
            )
        )

    # 2. If it's a file finding intent, extract refined search terms and file type filter
    actual_q = q
    filter_type = None
    if intent and intent.intent_type == "find_file":
        actual_q = intent.action_data.get("query") or q
        filter_type = intent.action_data.get("file_type")

    hits, total = quick_search(db, actual_q if actual_q.strip() else q, file_type=filter_type, limit=limit)
    for h in hits:
        results.append(
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
        )

    took_ms = (time.perf_counter() - started) * 1000
    return SearchResponse(results=results, total=total + len(results) - len(hits), query=q, took_ms=round(took_ms, 2))
