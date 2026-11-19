"""
Local search orchestration for Recall.

Ranks filename matches and extracted content (OCR, PDF text, notes)
using SQLite LIKE queries — no cloud dependency.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models.file import ExtractedContent, File

logger = logging.getLogger(__name__)

SNIPPET_MAX_LEN = 220


@dataclass
class RankedHit:
    file_id: str
    filename: str
    file_type: str
    content_snippet: str
    content_type: str
    page_number: Optional[int]
    confidence: Optional[float]
    local_path: str
    score: float
    updated_at: Optional[str] = None


def _make_snippet(text: str, query: str, max_len: int = SNIPPET_MAX_LEN) -> str:
    if not text:
        return ""

    lower_text = text.lower()
    lower_query = query.lower()
    idx = lower_text.find(lower_query)

    if idx == -1:
        # Try first token
        token = lower_query.split()[0] if lower_query.split() else lower_query
        idx = lower_text.find(token)

    if idx == -1:
        return text[:max_len] + ("…" if len(text) > max_len else "")

    start = max(0, idx - max_len // 4)
    end = min(len(text), idx + len(query) + max_len * 3 // 4)
    snippet = text[start:end].replace("\n", " ").strip()

    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"

    return snippet


def _score_filename(filename: str, query: str) -> float:
    name = filename.lower()
    q = query.lower().strip()
    if not q:
        return 0.0
    if name == q:
        return 100.0
    stem = name.rsplit(".", 1)[0]
    if stem == q:
        return 95.0
    if name.startswith(q):
        return 80.0
    if q in name:
        return 60.0
    # token overlap
    tokens = [t for t in re.split(r"[\s_\-.]+", q) if t]
    if tokens and all(t in name for t in tokens):
        return 50.0
    return 0.0


def _score_content(text: str, query: str, confidence: Optional[float]) -> float:
    if not text:
        return 0.0
    lower = text.lower()
    q = query.lower().strip()
    if not q:
        return 0.0

    score = 0.0
    if q in lower:
        # denser / earlier matches rank higher
        idx = lower.find(q)
        density = lower.count(q)
        score = 40.0 + min(20.0, density * 2.0) + max(0.0, 10.0 - idx / 200.0)
    else:
        tokens = [t for t in re.split(r"\s+", q) if len(t) > 1]
        hits = sum(1 for t in tokens if t in lower)
        if hits:
            score = 15.0 * (hits / max(len(tokens), 1))

    if confidence is not None:
        score += max(0.0, min(5.0, confidence / 20.0))

    return score


def quick_search(
    db: Session,
    q: str,
    *,
    file_type: Optional[str] = None,
    limit: int = 10,
) -> tuple[list[RankedHit], int]:
    """
    Search filenames + extracted content and return ranked hits.

    Prefers SQLite FTS5 when available, then falls back to LIKE ranking.
    Returns (hits, total_unique_files_considered).
    """
    query = (q or "").strip()
    if not query:
        return [], 0

    limit = max(1, min(limit, 25))

    # Fast path: local FTS5 index (auto-indexed local storage + manuals)
    try:
        from backend.app.indexing.fts import fts_search

        fts_rows = fts_search(db, query, limit=limit, file_type=file_type)
        if fts_rows:
            hits: list[RankedHit] = []
            for row in fts_rows:
                snip = (row.get("snip") or "").replace("«", "").replace("»", "")
                content = row.get("content") or ""
                if not snip and content:
                    snip = _make_snippet(content, query)
                # bm25: lower is better → invert for display score
                rank = float(row.get("rank") or 0)
                score = max(1.0, 100.0 - abs(rank))
                score = max(score, _score_filename(row.get("filename") or "", query))
                hits.append(
                    RankedHit(
                        file_id=row["file_id"],
                        filename=row.get("filename") or "",
                        file_type=row.get("file_type") or "document",
                        content_snippet=snip or (row.get("filename") or ""),
                        content_type="fts",
                        page_number=None,
                        confidence=None,
                        local_path=row.get("local_path") or "",
                        score=score,
                    )
                )
            return hits, len(hits)
    except Exception:
        logger.debug("FTS unavailable; using LIKE search", exc_info=True)

    like = f"%{query}%"

    # Filename matches
    file_q = db.query(File).filter(File.filename.ilike(like))
    if file_type:
        file_q = file_q.filter(File.file_type == file_type)
    filename_rows = file_q.limit(50).all()

    # Content matches
    content_q = (
        db.query(ExtractedContent, File)
        .join(File, ExtractedContent.file_id == File.id)
        .filter(ExtractedContent.content_text.ilike(like))
    )
    if file_type:
        content_q = content_q.filter(File.file_type == file_type)

    content_rows = content_q.limit(80).all()

    best: dict[str, RankedHit] = {}

    for f in filename_rows:
        score = _score_filename(f.filename, query)
        if score <= 0:
            continue
        # Prefer a short content preview if available
        ec = (
            db.query(ExtractedContent)
            .filter(ExtractedContent.file_id == f.id)
            .order_by(ExtractedContent.extracted_at.desc())
            .first()
        )
        snippet = ""
        content_type = "filename"
        page_number = None
        confidence = None
        if ec and ec.content_text:
            snippet = _make_snippet(ec.content_text, query)
            content_type = ec.content_type
            page_number = ec.page_number
            confidence = ec.confidence
            score += _score_content(ec.content_text, query, confidence) * 0.25
        else:
            snippet = f.filename

        hit = RankedHit(
            file_id=f.id,
            filename=f.filename,
            file_type=f.file_type,
            content_snippet=snippet,
            content_type=content_type,
            page_number=page_number,
            confidence=confidence,
            local_path=f.local_path,
            score=score,
            updated_at=f.updated_at.isoformat() if f.updated_at else None,
        )
        prev = best.get(f.id)
        if prev is None or hit.score > prev.score:
            best[f.id] = hit

    for ec, f in content_rows:
        score = _score_content(ec.content_text or "", query, ec.confidence)
        score += _score_filename(f.filename, query) * 0.35
        if score <= 0:
            continue
        hit = RankedHit(
            file_id=f.id,
            filename=f.filename,
            file_type=f.file_type,
            content_snippet=_make_snippet(ec.content_text or "", query),
            content_type=ec.content_type,
            page_number=ec.page_number,
            confidence=ec.confidence,
            local_path=f.local_path,
            score=score,
            updated_at=f.updated_at.isoformat() if f.updated_at else None,
        )
        prev = best.get(f.id)
        if prev is None or hit.score > prev.score:
            best[f.id] = hit

    ranked = sorted(best.values(), key=lambda h: h.score, reverse=True)
    total = len(ranked)
    return ranked[:limit], total
