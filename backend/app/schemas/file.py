"""
Pydantic schemas for Recall API request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# File schemas
# ---------------------------------------------------------------------------

class FileCreate(BaseModel):
    """Schema for creating a new file record."""

    filename: str = Field(..., min_length=1, max_length=512, description="Original file name")
    file_type: str = Field(
        ..., pattern=r"^(image|pdf|note|document)$", description="Type of file"
    )
    file_size: int = Field(0, ge=0, description="File size in bytes")
    local_path: str = Field(..., min_length=1, max_length=1024, description="Absolute path on disk")
    mime_type: Optional[str] = Field(None, max_length=128, description="MIME type")
    content: Optional[str] = Field(
        None,
        description="Inline text content (used for notes so they become searchable)",
    )


class FileResponse(BaseModel):
    """Schema for a single file record returned by the API."""

    id: str
    filename: str
    file_type: str
    file_size: int
    local_path: str
    sha256_hash: Optional[str] = None
    mime_type: Optional[str] = None
    indexing_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    """Paginated list of file records."""

    files: list[FileResponse]
    total: int


# ---------------------------------------------------------------------------
# Extracted content schemas
# ---------------------------------------------------------------------------

class ExtractedContentResponse(BaseModel):
    """Schema for extracted content returned by the API."""

    id: str
    file_id: str
    content_text: Optional[str] = None
    content_type: str
    page_number: Optional[int] = None
    confidence: Optional[float] = None
    extracted_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Search schemas
# ---------------------------------------------------------------------------

class SearchResult(BaseModel):
    """A single search hit."""

    file_id: str
    filename: str
    file_type: str
    content_snippet: str
    content_type: str
    page_number: Optional[int] = None
    confidence: Optional[float] = None
    local_path: str
    score: float = 0.0
    updated_at: Optional[str] = None


class SearchResponse(BaseModel):
    """Paginated search results."""

    results: list[SearchResult]
    total: int
    query: str
    took_ms: Optional[float] = None


# ---------------------------------------------------------------------------
# Stats schemas
# ---------------------------------------------------------------------------

class StatsResponse(BaseModel):
    """Aggregate statistics about indexed content."""

    total_files: int = 0
    total_images: int = 0
    total_pdfs: int = 0
    total_notes: int = 0
    total_indexed: int = 0
    storage_used: int = 0  # bytes
    images: int = 0
    pdfs: int = 0
    notes: int = 0


# ---------------------------------------------------------------------------
# Health schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Health-check payload."""

    status: str  # "healthy" | "unhealthy"
    version: str
    database: bool
    timestamp: datetime
