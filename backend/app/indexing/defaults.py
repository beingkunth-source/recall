"""Default exclusions and supported extensions for local indexing."""

from __future__ import annotations

# Directory *names* skipped anywhere in the tree
DEFAULT_EXCLUDED_NAMES = {
    "$recycle.bin",
    "recycle.bin",
    "system volume information",
    "windows",
    "program files",
    "program files (x86)",
    "programdata",
    "appdata",
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    "__pycache__",
    ".venv",
    "venv",
    ".cache",
    "cache",
    "caches",
    "tmp",
    "temp",
    ".tmp",
    "nvidia",
    "intel",
    "amd",
    "msocache",
    "recovery",
    "perflogs",
    "boot",
    "efi",
    ".trash",
    ".local",
    "library",  # mac-ish
    "database",
    "recall",
}

# Absolute path prefixes (normalized lower) skipped by default on Windows
DEFAULT_EXCLUDED_PREFIXES = [
    r"c:\windows",
    r"c:\program files",
    r"c:\program files (x86)",
    r"c:\programdata",
    r"c:\$recycle.bin",
    r"c:\system volume information",
    r"c:\recovery",
    r"c:\boot",
    r"c:\efi",
]

# Ext -> (file_type, content_extractor_key)
# content_extractor_key: none | text | pdf | ocr | docx | xlsx | pptx | html
SUPPORTED_EXTENSIONS: dict[str, tuple[str, str]] = {
    # Documents
    ".pdf": ("pdf", "pdf"),
    ".txt": ("document", "text"),
    ".md": ("document", "text"),
    ".markdown": ("document", "text"),
    ".csv": ("document", "text"),
    ".json": ("document", "text"),
    ".xml": ("document", "text"),
    ".html": ("document", "html"),
    ".htm": ("document", "html"),
    ".log": ("document", "text"),
    ".docx": ("document", "docx"),
    ".xlsx": ("document", "xlsx"),
    ".pptx": ("document", "pptx"),
    # Code
    ".py": ("document", "text"),
    ".js": ("document", "text"),
    ".ts": ("document", "text"),
    ".tsx": ("document", "text"),
    ".jsx": ("document", "text"),
    ".java": ("document", "text"),
    ".c": ("document", "text"),
    ".cpp": ("document", "text"),
    ".h": ("document", "text"),
    ".hpp": ("document", "text"),
    ".cs": ("document", "text"),
    ".go": ("document", "text"),
    ".rs": ("document", "text"),
    ".rb": ("document", "text"),
    ".php": ("document", "text"),
    ".css": ("document", "text"),
    ".scss": ("document", "text"),
    ".sql": ("document", "text"),
    ".yaml": ("document", "text"),
    ".yml": ("document", "text"),
    ".toml": ("document", "text"),
    ".ini": ("document", "text"),
    ".cfg": ("document", "text"),
    ".sh": ("document", "text"),
    ".ps1": ("document", "text"),
    ".bat": ("document", "text"),
    ".cmd": ("document", "text"),
    # Images (OCR optional)
    ".png": ("image", "ocr"),
    ".jpg": ("image", "ocr"),
    ".jpeg": ("image", "ocr"),
    ".gif": ("image", "ocr"),
    ".webp": ("image", "ocr"),
    ".bmp": ("image", "ocr"),
    ".tif": ("image", "ocr"),
    ".tiff": ("image", "ocr"),
}

# Always index metadata for these even without content extractors
METADATA_ONLY_EXTENSIONS = {
    ".lnk",
    ".exe",
    ".appref-ms",
    ".doc",
    ".xls",
    ".ppt",
    ".rtf",
    ".odt",
    ".ods",
    ".odp",
    ".epub",
    ".zip",
    ".7z",
    ".rar",
}

MAX_TEXT_FILE_BYTES = 8 * 1024 * 1024  # 8 MB
MAX_OCR_IMAGE_BYTES = 25 * 1024 * 1024
HASH_SAMPLE_BYTES = 1024 * 1024  # hash first 1MB + size + mtime for speed
