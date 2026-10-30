"""
PDF text extraction engine for Recall.

Uses PyMuPDF (fitz) to extract text from PDF documents
with per-page granularity.
"""

import logging
import os

logger = logging.getLogger(__name__)


class PDFExtractor:
    """
    Extracts text content from PDF files using PyMuPDF.

    Handles corrupt files, empty pages, and password-protected PDFs
    gracefully by returning structured error dicts instead of raising.
    """

    def extract_text(self, pdf_path: str) -> dict:
        """
        Extract text from every page of a PDF.

        Args:
            pdf_path: Absolute or relative path to a PDF file.

        Returns:
            dict with keys:
                pages (list[dict])  – [{"page_number": int, "text": str}, ...]
                total_pages (int)
                success (bool)
                error (str|None)
        """
        if not os.path.isfile(pdf_path):
            return {
                "pages": [],
                "total_pages": 0,
                "success": False,
                "error": f"File not found: {pdf_path}",
            }

        try:
            import fitz  # PyMuPDF
        except ImportError as exc:
            return {
                "pages": [],
                "total_pages": 0,
                "success": False,
                "error": f"Missing dependency: {exc}",
            }

        try:
            doc = fitz.open(pdf_path)
        except Exception as exc:
            return {
                "pages": [],
                "total_pages": 0,
                "success": False,
                "error": f"Cannot open PDF: {exc}",
            }

        try:
            pages: list[dict] = []
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text("text").strip()
                pages.append({
                    "page_number": page_num + 1,  # 1-indexed
                    "text": text,
                })

            return {
                "pages": pages,
                "total_pages": len(doc),
                "success": True,
                "error": None,
            }
        except Exception as exc:
            logger.exception("PDF extraction failed for %s", pdf_path)
            return {
                "pages": [],
                "total_pages": 0,
                "success": False,
                "error": f"PDF extraction failed: {exc}",
            }
        finally:
            doc.close()

    def extract_page(self, pdf_path: str, page_number: int) -> dict:
        """
        Extract text from a single page of a PDF.

        Args:
            pdf_path:    Path to the PDF file.
            page_number: 1-indexed page number.

        Returns:
            dict with keys:
                page_number (int)
                text (str)
                success (bool)
                error (str|None)
        """
        if not os.path.isfile(pdf_path):
            return {
                "page_number": page_number,
                "text": "",
                "success": False,
                "error": f"File not found: {pdf_path}",
            }

        try:
            import fitz
        except ImportError as exc:
            return {
                "page_number": page_number,
                "text": "",
                "success": False,
                "error": f"Missing dependency: {exc}",
            }

        try:
            doc = fitz.open(pdf_path)
        except Exception as exc:
            return {
                "page_number": page_number,
                "text": "",
                "success": False,
                "error": f"Cannot open PDF: {exc}",
            }

        try:
            if page_number < 1 or page_number > len(doc):
                return {
                    "page_number": page_number,
                    "text": "",
                    "success": False,
                    "error": (
                        f"Page {page_number} out of range "
                        f"(document has {len(doc)} pages)."
                    ),
                }

            page = doc.load_page(page_number - 1)  # 0-indexed internally
            text = page.get_text("text").strip()
            return {
                "page_number": page_number,
                "text": text,
                "success": True,
                "error": None,
            }
        except Exception as exc:
            logger.exception(
                "PDF page extraction failed for %s page %d", pdf_path, page_number
            )
            return {
                "page_number": page_number,
                "text": "",
                "success": False,
                "error": f"Page extraction failed: {exc}",
            }
        finally:
            doc.close()
