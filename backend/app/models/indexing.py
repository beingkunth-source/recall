"""ORM models for automatic local indexing roots and exclusions."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from backend.app.database.connection import Base
from backend.app.models.file import _generate_uuid, _utcnow


class IndexRoot(Base):
    """A user-selected folder/drive that Recall is allowed to index."""

    __tablename__ = "index_roots"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    path = Column(String(1024), nullable=False, unique=True, index=True)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=_utcnow, nullable=False)
    last_scan_at = Column(DateTime, nullable=True)
    files_discovered = Column(Integer, default=0)
    files_indexed = Column(Integer, default=0)


class IndexExclusion(Base):
    """Path prefixes / directory names excluded from scanning."""

    __tablename__ = "index_exclusions"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    pattern = Column(String(1024), nullable=False, unique=True)
    kind = Column(String(32), default="prefix")  # prefix | name
    created_at = Column(DateTime, default=_utcnow, nullable=False)


class IndexerState(Base):
    """Singleton-ish key/value state for the background indexer."""

    __tablename__ = "indexer_state"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow, nullable=False)
