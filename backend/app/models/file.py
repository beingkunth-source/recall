"""
SQLAlchemy ORM models for Recall.

Defines the core data entities: File, FileMetadata, ExtractedContent, and Note.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from backend.app.database.connection import Base


def _generate_uuid() -> str:
    """Generate a new UUID4 string."""
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


class File(Base):
    """Represents an indexed file (image, PDF, document, or note reference)."""

    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    filename = Column(String(512), nullable=False, index=True)
    file_type = Column(String(50), nullable=False, index=True)  # image, pdf, note, document
    file_size = Column(Integer, default=0)
    local_path = Column(String(1024), nullable=False, unique=True, index=True)
    sha256_hash = Column(String(64), nullable=True, index=True)
    mime_type = Column(String(128), nullable=True)
    indexing_status = Column(
        String(20), nullable=False, default="pending", index=True
    )  # pending, processing, completed, failed, skipped
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)
    # Automatic indexing fields
    mtime = Column(Float, nullable=True, index=True)  # os path mtime
    content_fingerprint = Column(String(64), nullable=True, index=True)
    content_indexed = Column(Integer, default=0)  # 1 if body text extracted
    index_source = Column(String(32), default="manual")  # manual | auto
    root_id = Column(String(36), nullable=True, index=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    metadata_entries = relationship(
        "FileMetadata", back_populates="file", cascade="all, delete-orphan"
    )
    extracted_contents = relationship(
        "ExtractedContent", back_populates="file", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<File(id={self.id!r}, filename={self.filename!r}, type={self.file_type!r})>"


class FileMetadata(Base):
    """Arbitrary key-value metadata associated with a file."""

    __tablename__ = "file_metadata"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    file_id = Column(
        String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    key = Column(String(256), nullable=False)
    value = Column(Text, nullable=True)

    # Relationships
    file = relationship("File", back_populates="metadata_entries")

    def __repr__(self) -> str:
        return f"<FileMetadata(file_id={self.file_id!r}, key={self.key!r})>"


class ExtractedContent(Base):
    """Text content extracted from a file via OCR, PDF parsing, etc."""

    __tablename__ = "extracted_content"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    file_id = Column(
        String(36), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content_text = Column(Text, nullable=True)
    content_type = Column(String(50), nullable=False)  # ocr, pdf_text, note
    page_number = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    extracted_at = Column(DateTime, default=_utcnow, nullable=False)

    # Relationships
    file = relationship("File", back_populates="extracted_contents")

    def __repr__(self) -> str:
        return (
            f"<ExtractedContent(file_id={self.file_id!r}, type={self.content_type!r}, "
            f"page={self.page_number})>"
        )


class Note(Base):
    """A user-created text note, searchable alongside files."""

    __tablename__ = "notes"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    title = Column(String(512), nullable=False, index=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<Note(id={self.id!r}, title={self.title!r})>"
