"""
OCR engine wrapper around Tesseract for Recall.

Provides text extraction from images with confidence scoring
and robust error handling.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


_CACHED_TESSERACT_PATH: Optional[str] = None
_PATH_RESOLVED: bool = False


class OCREngine:
    """
    Wraps pytesseract to extract text from images.

    Attributes:
        tesseract_path: Explicit path to the tesseract binary.
                        Falls back to the TESSERACT_PATH env var.
    """

    def __init__(self, tesseract_path: Optional[str] = None) -> None:
        self._tesseract_path = self._resolve_tesseract_path(tesseract_path)
        self._configure_tesseract()

    def _resolve_tesseract_path(self, explicit_path: Optional[str] = None) -> Optional[str]:
        """Resolve tesseract binary path from parameter, env var, or well-known locations."""
        global _CACHED_TESSERACT_PATH, _PATH_RESOLVED

        if explicit_path and os.path.isfile(explicit_path):
            return explicit_path

        if not explicit_path and _PATH_RESOLVED:
            return _CACHED_TESSERACT_PATH

        env_path = os.getenv("TESSERACT_PATH")
        if env_path and os.path.isfile(env_path):
            _CACHED_TESSERACT_PATH = env_path
            _PATH_RESOLVED = True
            return env_path

        # Candidate paths for bundled / installed Tesseract
        import sys
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        exe_dir = os.path.abspath(os.path.dirname(sys.executable)) if getattr(sys, "frozen", False) else base_dir
        candidates = [
            os.path.join(base_dir, "bin", "tesseract", "tesseract.exe"),
            os.path.join(exe_dir, "bin", "tesseract", "tesseract.exe"),
            os.path.join(exe_dir, "..", "bin", "tesseract", "tesseract.exe"),
            os.path.join(exe_dir, "..", "..", "bin", "tesseract", "tesseract.exe"),
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Tesseract-OCR\tesseract.exe"),
        ]

        for candidate in candidates:
            if os.path.isfile(candidate):
                _CACHED_TESSERACT_PATH = candidate
                _PATH_RESOLVED = True
                return candidate

        _CACHED_TESSERACT_PATH = None
        _PATH_RESOLVED = True
        return None

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------

    def _configure_tesseract(self) -> None:
        """Point pytesseract at the correct binary and tessdata directory."""
        try:
            import pytesseract  # noqa: F811

            if self._tesseract_path and os.path.isfile(self._tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = self._tesseract_path
                tessdata_dir = os.path.join(os.path.dirname(self._tesseract_path), "tessdata")
                if os.path.isdir(tessdata_dir) and "TESSDATA_PREFIX" not in os.environ:
                    os.environ["TESSDATA_PREFIX"] = tessdata_dir
                logger.info("Tesseract path set to: %s", self._tesseract_path)
            else:
                logger.info(
                    "Using system-default tesseract (TESSERACT_PATH not set "
                    "or file does not exist)."
                )
        except ImportError:
            logger.warning("pytesseract is not installed.")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_text(self, image_path: str) -> dict:
        """
        Extract text from an image file.

        Args:
            image_path: Absolute or relative path to a JPG / PNG image.

        Returns:
            dict with keys:
                text (str)       – extracted text (may be empty)
                confidence (float) – mean OCR confidence 0-100, or 0.0
                success (bool)
                error (str|None)
        """
        if not os.path.isfile(image_path):
            return {
                "text": "",
                "confidence": 0.0,
                "success": False,
                "error": f"File not found: {image_path}",
            }

        try:
            from PIL import Image
            import pytesseract
        except ImportError as exc:
            return {
                "text": "",
                "confidence": 0.0,
                "success": False,
                "error": f"Missing dependency: {exc}",
            }

        try:
            image = Image.open(image_path)
        except Exception as exc:
            return {
                "text": "",
                "confidence": 0.0,
                "success": False,
                "error": f"Cannot open image: {exc}",
            }

        try:
            # Get detailed data for confidence calculation
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            confidences = [
                int(c) for c, txt in zip(data["conf"], data["text"])
                if int(c) > -1 and txt.strip()
            ]
            mean_confidence = (
                sum(confidences) / len(confidences) if confidences else 0.0
            )

            text = pytesseract.image_to_string(image).strip()

            return {
                "text": text,
                "confidence": round(mean_confidence, 2),
                "success": True,
                "error": None,
            }
        except Exception as exc:
            logger.exception("OCR extraction failed for %s", image_path)
            return {
                "text": "",
                "confidence": 0.0,
                "success": False,
                "error": f"OCR extraction failed: {exc}",
            }

    def is_available(self) -> bool:
        """Return True if Tesseract is installed and callable."""
        try:
            import pytesseract

            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False
