"""Local content extractors — never upload; all processing stays on-disk."""

from __future__ import annotations

import logging
import os
import re
from html.parser import HTMLParser
from typing import Optional

from backend.app.indexing.defaults import MAX_OCR_IMAGE_BYTES, MAX_TEXT_FILE_BYTES

logger = logging.getLogger(__name__)


class _HTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self._skip = True

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"}:
            self._skip = False

    def handle_data(self, data):
        if not self._skip and data and data.strip():
            self._chunks.append(data.strip())

    def text(self) -> str:
        return "\n".join(self._chunks)


def extract_plain_text(path: str) -> tuple[Optional[str], str]:
    """Return (text, content_type). text is None on failure."""
    try:
        size = os.path.getsize(path)
        if size > MAX_TEXT_FILE_BYTES:
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                text = fh.read(MAX_TEXT_FILE_BYTES)
            return text, "text_truncated"
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            return fh.read(), "text"
    except OSError as exc:
        logger.warning("text extract failed %s: %s", path, exc)
        return None, "text"


def extract_html(path: str) -> tuple[Optional[str], str]:
    raw, _ = extract_plain_text(path)
    if raw is None:
        return None, "html"
    parser = _HTMLTextExtractor()
    try:
        parser.feed(raw)
        return parser.text(), "html"
    except Exception:
        # fallback strip tags roughly
        return re.sub(r"<[^>]+>", " ", raw), "html"


def extract_docx(path: str) -> tuple[Optional[str], str]:
    try:
        from docx import Document

        doc = Document(path)
        parts = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text and cell.text.strip():
                        parts.append(cell.text.strip())
        return "\n".join(parts), "docx"
    except Exception as exc:
        logger.warning("docx extract failed %s: %s", path, exc)
        return None, "docx"


def extract_xlsx(path: str) -> tuple[Optional[str], str]:
    try:
        from openpyxl import load_workbook

        wb = load_workbook(path, read_only=True, data_only=True)
        parts: list[str] = []
        for sheet in wb.worksheets:
            parts.append(f"# {sheet.title}")
            for row in sheet.iter_rows(values_only=True):
                cells = [str(c) for c in row if c is not None and str(c).strip()]
                if cells:
                    parts.append("\t".join(cells))
        wb.close()
        return "\n".join(parts), "xlsx"
    except Exception as exc:
        logger.warning("xlsx extract failed %s: %s", path, exc)
        return None, "xlsx"


def extract_pptx(path: str) -> tuple[Optional[str], str]:
    try:
        from pptx import Presentation

        prs = Presentation(path)
        parts: list[str] = []
        for i, slide in enumerate(prs.slides, start=1):
            parts.append(f"# Slide {i}")
            for shape in slide.shapes:
                if hasattr(shape, "text") and shape.text:
                    parts.append(shape.text)
        return "\n".join(parts), "pptx"
    except Exception as exc:
        logger.warning("pptx extract failed %s: %s", path, exc)
        return None, "pptx"


_pdf_extractor = None
_ocr_engine = None


def extract_pdf(path: str) -> tuple[Optional[str], str]:
    global _pdf_extractor
    try:
        if _pdf_extractor is None:
            from core.pdf.extractor import PDFExtractor
            _pdf_extractor = PDFExtractor()

        result = _pdf_extractor.extract_text(path)
        if not result.get("success"):
            return None, "pdf_text"
        pages = result.get("pages") or []
        text = "\n\n".join(
            f"[Page {p.get('page_number')}]\n{p.get('text') or ''}" for p in pages
        )
        return text, "pdf_text"
    except Exception as exc:
        logger.warning("pdf extract failed %s: %s", path, exc)
        return None, "pdf_text"


def extract_ocr(path: str) -> tuple[Optional[str], str, Optional[float]]:
    global _ocr_engine
    try:
        if os.path.getsize(path) > MAX_OCR_IMAGE_BYTES:
            return None, "ocr", None
        if _ocr_engine is None:
            from core.ocr.engine import OCREngine
            _ocr_engine = OCREngine()

        result = _ocr_engine.extract_text(path)
        if not result.get("success"):
            return None, "ocr", None
        return result.get("text"), "ocr", result.get("confidence")
    except Exception as exc:
        logger.warning("ocr extract failed %s: %s", path, exc)
        return None, "ocr", None


def extract_content(
    path: str, extractor_key: str
) -> tuple[Optional[str], str, Optional[float]]:
    """Dispatch to the right extractor. Returns (text, content_type, confidence)."""
    if extractor_key == "none" or not extractor_key:
        return None, "metadata", None
    if extractor_key == "text":
        text, ctype = extract_plain_text(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "html":
        text, ctype = extract_html(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "docx":
        text, ctype = extract_docx(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "xlsx":
        text, ctype = extract_xlsx(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "pptx":
        text, ctype = extract_pptx(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "pdf":
        text, ctype = extract_pdf(path)
        return text, ctype, 1.0 if text else None
    if extractor_key == "ocr":
        return extract_ocr(path)
    return None, "metadata", None
