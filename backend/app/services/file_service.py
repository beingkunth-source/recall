"""
File service – CRUD and orchestration logic for file records.
"""

import hashlib
import logging
import os
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models.file import ExtractedContent, File
from backend.app.schemas.file import FileCreate

logger = logging.getLogger(__name__)

HASH_CHUNK_SIZE = 8192  # bytes per read when hashing


def _compute_sha256(path: str) -> Optional[str]:
    """Return the hex-encoded SHA-256 digest of a file, or None on error."""
    if not os.path.isfile(path):
        return None
    try:
        h = hashlib.sha256()
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(HASH_CHUNK_SIZE)
                if not chunk:
                    break
                h.update(chunk)
        return h.hexdigest()
    except OSError as exc:
        logger.warning("Could not hash %s: %s", path, exc)
        return None


def create_file(db: Session, file_data: FileCreate) -> File:
    """
    Persist a new File record.

    Computes the SHA-256 hash when the file exists on disk.
    Optional inline content (notes) is attached for background indexing.
    """
    sha256 = _compute_sha256(file_data.local_path)

    db_file = File(
        filename=file_data.filename,
        file_type=file_data.file_type,
        file_size=file_data.file_size or (
            len(file_data.content.encode("utf-8")) if file_data.content else 0
        ),
        local_path=file_data.local_path,
        sha256_hash=sha256,
        mime_type=file_data.mime_type,
        indexing_status="pending",
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    # Stash note body on the instance for process_file (not a DB column).
    if file_data.content:
        setattr(db_file, "_inline_content", file_data.content)

    logger.info("Created file record %s for %s", db_file.id, db_file.filename)
    return db_file


def _index_note_content(db: Session, file_id: str, content: str) -> None:
    """Persist searchable note text into extracted_content."""
    db.add(
        ExtractedContent(
            file_id=file_id,
            content_text=content,
            content_type="note",
            confidence=1.0,
        )
    )
    db.commit()


def get_files(
    db: Session,
    file_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[File], int]:
    """
    Return a paginated list of files, optionally filtered by type.

    Returns a (files, total_count) tuple.
    """
    query = db.query(File)
    if file_type:
        query = query.filter(File.file_type == file_type)

    total = query.count()
    files = (
        query.order_by(File.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return files, total


def get_file(db: Session, file_id: str) -> Optional[File]:
    """Look up a single file by its UUID."""
    return db.query(File).filter(File.id == file_id).first()


def process_file_background(file_id: str, inline_content: Optional[str] = None) -> None:
    """Entry point for background task execution with independent session management."""
    from backend.app.database.connection import SessionLocal
    db = SessionLocal()
    try:
        process_file(db, file_id, inline_content=inline_content)
    finally:
        db.close()


def process_file(
    db: Session, file_id: str, inline_content: Optional[str] = None
) -> None:
    """
    Orchestrate content extraction for a file based on its type.

    Delegates to the appropriate service (OCR, PDF, etc.) and updates
    the file's indexing_status accordingly.
    """
    from backend.app.services.ocr_service import process_image
    from backend.app.services.pdf_service import process_pdf

    db_file = get_file(db, file_id)
    if db_file is None:
        logger.error("process_file called with unknown file_id=%s", file_id)
        return

    # Mark as processing
    db_file.indexing_status = "processing"
    db.commit()

    try:
        if db_file.file_type == "image":
            process_image(db, file_id)
        elif db_file.file_type == "pdf":
            process_pdf(db, file_id)
        elif db_file.file_type == "note":
            content = inline_content
            if not content and os.path.isfile(db_file.local_path):
                try:
                    with open(db_file.local_path, "r", encoding="utf-8") as fh:
                        content = fh.read()
                except OSError as exc:
                    logger.warning("Could not read note file %s: %s", db_file.local_path, exc)

            if content:
                _index_note_content(db, file_id, content)

            db_file.indexing_status = "completed"
            db.commit()
            return
        else:
            logger.warning(
                "No processor for file_type=%s (file_id=%s)",
                db_file.file_type,
                file_id,
            )
            db_file.indexing_status = "completed"
            db.commit()
            return

        # Re-fetch to check latest status set by sub-service
        db.refresh(db_file)
        if db_file.indexing_status == "processing":
            db_file.indexing_status = "completed"
            db.commit()

    except Exception:
        logger.exception("Processing failed for file_id=%s", file_id)
        db_file.indexing_status = "failed"
        db.commit()
