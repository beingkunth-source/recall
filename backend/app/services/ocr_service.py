"""
OCR service – bridges the core OCR engine with the database layer.
"""

import logging

from sqlalchemy.orm import Session

from backend.app.models.file import File, ExtractedContent
from core.ocr.engine import OCREngine

logger = logging.getLogger(__name__)

# Module-level singleton (lazily configured via env vars)
_engine = OCREngine()


def process_image(db: Session, file_id: str) -> None:
    """
    Run OCR on the image associated with *file_id* and persist the
    extracted text as an ExtractedContent record.

    Updates the file's indexing_status to 'completed' or 'failed'.
    """
    db_file = db.query(File).filter(File.id == file_id).first()
    if db_file is None:
        logger.error("process_image: file not found (id=%s)", file_id)
        return

    result = _engine.extract_text(db_file.local_path)

    if result["success"]:
        content = ExtractedContent(
            file_id=file_id,
            content_text=result["text"],
            content_type="ocr",
            page_number=None,
            confidence=result["confidence"],
        )
        db.add(content)
        db_file.indexing_status = "completed"
    else:
        logger.warning(
            "OCR failed for file %s: %s", file_id, result.get("error")
        )
        db_file.indexing_status = "failed"

    db.commit()
