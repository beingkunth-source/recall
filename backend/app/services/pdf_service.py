"""
PDF service – bridges the core PDF extractor with the database layer.
"""

import logging

from sqlalchemy.orm import Session

from backend.app.models.file import File, ExtractedContent
from core.pdf.extractor import PDFExtractor

logger = logging.getLogger(__name__)

_extractor = PDFExtractor()


def process_pdf(db: Session, file_id: str) -> None:
    """
    Extract text from every page of the PDF associated with *file_id*
    and persist each page as an ExtractedContent record.

    Updates the file's indexing_status to 'completed' or 'failed'.
    """
    db_file = db.query(File).filter(File.id == file_id).first()
    if db_file is None:
        logger.error("process_pdf: file not found (id=%s)", file_id)
        return

    result = _extractor.extract_text(db_file.local_path)

    if result["success"]:
        for page in result["pages"]:
            content = ExtractedContent(
                file_id=file_id,
                content_text=page["text"],
                content_type="pdf_text",
                page_number=page["page_number"],
                confidence=None,
            )
            db.add(content)

        db_file.indexing_status = "completed"
    else:
        logger.warning(
            "PDF extraction failed for file %s: %s",
            file_id,
            result.get("error"),
        )
        db_file.indexing_status = "failed"

    db.commit()
