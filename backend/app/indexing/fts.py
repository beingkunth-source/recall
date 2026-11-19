"""SQLite FTS5 helpers for local full-text search."""

from __future__ import annotations

import logging
import re
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

FTS_CREATE = """
CREATE VIRTUAL TABLE IF NOT EXISTS file_fts USING fts5(
    file_id UNINDEXED,
    filename,
    local_path,
    file_type UNINDEXED,
    content,
    tokenize = 'porter unicode61'
);
"""


def ensure_fts(db: Session) -> None:
    db.execute(text(FTS_CREATE))
    db.commit()


def fts_upsert(
    db: Session,
    *,
    file_id: str,
    filename: str,
    local_path: str,
    file_type: str,
    content: str,
) -> None:
    db.execute(text("DELETE FROM file_fts WHERE file_id = :id"), {"id": file_id})
    db.execute(
        text(
            """
            INSERT INTO file_fts(file_id, filename, local_path, file_type, content)
            VALUES (:file_id, :filename, :local_path, :file_type, :content)
            """
        ),
        {
            "file_id": file_id,
            "filename": filename or "",
            "local_path": local_path or "",
            "file_type": file_type or "",
            "content": content or "",
        },
    )


def fts_delete(db: Session, file_id: str) -> None:
    db.execute(text("DELETE FROM file_fts WHERE file_id = :id"), {"id": file_id})


def _fts_query(raw: str) -> str:
    """Build a safe FTS5 MATCH query from user input."""
    tokens = re.findall(r'[\w\-]+', raw, flags=re.UNICODE)
    if not tokens:
        return '""'
    # Prefer AND of prefix matches for interactive search
    parts = [f'"{t}"*' if len(t) > 2 else f'"{t}"' for t in tokens[:12]]
    return " AND ".join(parts)


def fts_search(
    db: Session,
    query: str,
    *,
    limit: int = 10,
    file_type: Optional[str] = None,
) -> list[dict]:
    ensure_fts(db)
    match = _fts_query(query)
    sql = """
        SELECT file_id, filename, local_path, file_type, content,
               bm25(file_fts) AS rank,
               snippet(file_fts, 4, '«', '»', '…', 24) AS snip
        FROM file_fts
        WHERE file_fts MATCH :q
    """
    params: dict = {"q": match, "limit": limit}
    if file_type:
        sql += " AND file_type = :ft"
        params["ft"] = file_type
    sql += " ORDER BY rank LIMIT :limit"
    try:
        rows = db.execute(text(sql), params).mappings().all()
        return [dict(r) for r in rows]
    except Exception as exc:
        logger.warning("FTS search failed (%s); falling back", exc)
        return []
