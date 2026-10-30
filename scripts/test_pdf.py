"""
Test script for the PDF text extractor.

Creates a simple one-page PDF with text, extracts the text,
and verifies the extraction was successful.
"""

import os
import sys
import tempfile

# Ensure the project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core.pdf.extractor import PDFExtractor

SAMPLE_TEXT = (
    "Hello Recall! This is a test PDF document.\n"
    "It contains sample text for extraction testing.\n"
    "Line three with special chars: é, ñ, ü."
)


def create_test_pdf(path: str) -> None:
    """Create a single-page PDF containing SAMPLE_TEXT using PyMuPDF."""
    import fitz  # PyMuPDF

    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # US Letter

    # Insert text block
    text_rect = fitz.Rect(72, 72, 540, 720)
    page.insert_textbox(
        text_rect,
        SAMPLE_TEXT,
        fontsize=14,
        fontname="helv",
        color=(0, 0, 0),
    )

    doc.save(path)
    doc.close()
    print(f"[+] Test PDF saved to: {path}")


def main() -> None:
    extractor = PDFExtractor()

    with tempfile.TemporaryDirectory() as tmpdir:
        pdf_path = os.path.join(tmpdir, "test_document.pdf")
        create_test_pdf(pdf_path)

        # --- full extraction ---
        result = extractor.extract_text(pdf_path)

        print(f"\nPDF Extraction Result:")
        print(f"  Success:     {result['success']}")
        print(f"  Total pages: {result['total_pages']}")
        for page in result["pages"]:
            print(f"  Page {page['page_number']}:     {page['text'][:80]!r}...")
        print(f"  Error:       {result['error']}")

        assert result["success"], f"Extraction failed: {result['error']}"
        assert result["total_pages"] == 1, f"Expected 1 page, got {result['total_pages']}"
        assert len(result["pages"]) == 1

        page_text = result["pages"][0]["text"]
        assert "Hello Recall" in page_text, (
            f"Expected 'Hello Recall' in page text, got: {page_text[:100]!r}"
        )

        # --- single-page extraction ---
        single = extractor.extract_page(pdf_path, 1)
        assert single["success"], f"Single-page extraction failed: {single['error']}"
        assert "Hello Recall" in single["text"]

        # --- out-of-range page ---
        bad_page = extractor.extract_page(pdf_path, 999)
        assert not bad_page["success"], "Expected failure for out-of-range page"

        print("\n[OK] PDF extraction test passed!")


if __name__ == "__main__":
    main()
