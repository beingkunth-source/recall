"""
Search endpoint for Recall API.

Provides basic LIKE-based full-text search across extracted content.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.models.file import ExtractedContent, File
from backend.app.schemas.file import SearchResponse, SearchResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])

# Maximum length of the snippet returned in search results
SNIPPET_MAX_LEN = 300


def _make_snippet(text: str, query: str, max_len: int = SNIPPET_MAX_LEN) -> str:
    """
    Build a context snippet around the first occurrence of *query* in *text*.

    Falls back to the first *max_len* characters if the query string is not
    found verbatim (e.g. because the LIKE match was case-insensitive).
    """
    if not text:
        return ""

    lower_text = text.lower()
    lower_query = query.lower()
    idx = lower_text.find(lower_query)

    if idx == -1:
        return text[:max_len] + ("…" if len(text) > max_len else "")

    start = max(0, idx - max_len // 4)
    end = min(len(text), idx + len(query) + max_len * 3 // 4)
    snippet = text[start:end]

    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"

    return snippet


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    file_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
) -> SearchResponse:
    """
    Search extracted content for matching text.

    Uses a basic SQL LIKE query.  A future iteration will switch to
    full-text search (FTS5) for better relevance ranking.
    """
    limit = min(limit, 100)

    query = (
        db.query(ExtractedContent, File)
        .join(File, ExtractedContent.file_id == File.id)
        .filter(ExtractedContent.content_text.ilike(f"%{q}%"))
    )

    if file_type:
        query = query.filter(File.file_type == file_type)

    total = query.count()

    rows = query.order_by(ExtractedContent.extracted_at.desc()).offset(skip).limit(limit).all()

    results = [
        SearchResult(
            file_id=ec.file_id,
            filename=f.filename,
            file_type=f.file_type,
            content_snippet=_make_snippet(ec.content_text or "", q),
            content_type=ec.content_type,
            page_number=ec.page_number,
            confidence=ec.confidence,
            local_path=f.local_path,
        )
        for ec, f in rows
    ]

    return SearchResponse(results=results, total=total, query=q)
