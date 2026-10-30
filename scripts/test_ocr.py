"""
Test script for the OCR engine.

Creates a simple test image with text drawn on it, runs OCR,
and verifies that text was extracted successfully.
"""

import os
import sys
import tempfile

# Ensure the project root is on sys.path so core.ocr can be imported
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core.ocr.engine import OCREngine


def create_test_image(path: str) -> None:
    """Draw 'Hello Recall' on a white 400×100 image and save it as PNG."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)

    # Try to use a common system font; fall back to the default bitmap font
    try:
        font = ImageFont.truetype("arial.ttf", size=36)
    except (OSError, IOError):
        font = ImageFont.load_default()

    draw.text((20, 25), "Hello Recall", fill="black", font=font)
    img.save(path)
    print(f"[+] Test image saved to: {path}")


def main() -> None:
    engine = OCREngine()

    # --- availability check ---
    print(f"Tesseract available: {engine.is_available()}")
    if not engine.is_available():
        print("[!] Tesseract is not available. Install it or set TESSERACT_PATH.")
        print("    Skipping OCR test (image creation will still be verified).")

    # --- create test image ---
    with tempfile.TemporaryDirectory() as tmpdir:
        img_path = os.path.join(tmpdir, "test_ocr.png")
        create_test_image(img_path)

        if not engine.is_available():
            print("[~] Test image created but OCR skipped (Tesseract not found).")
            return

        # --- run OCR ---
        result = engine.extract_text(img_path)

        print(f"\nOCR Result:")
        print(f"  Success:    {result['success']}")
        print(f"  Text:       {result['text']!r}")
        print(f"  Confidence: {result['confidence']}")
        print(f"  Error:      {result['error']}")

        # --- basic assertions ---
        assert result["success"], f"OCR failed: {result['error']}"
        assert len(result["text"]) > 0, "No text extracted"
        assert "hello" in result["text"].lower() or "recall" in result["text"].lower(), (
            f"Expected 'Hello' or 'Recall' in extracted text, got: {result['text']!r}"
        )
        print("\n[OK] OCR test passed!")


if __name__ == "__main__":
    main()
