"""
Database connection and session management for Recall.

Uses SQLAlchemy with SQLite backend. Enables WAL mode for better
concurrent read/write performance.
"""

import logging
import os
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

logger = logging.getLogger(__name__)

# Database URL with fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/recall.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_sqlite_columns() -> None:
    """Add new columns to existing SQLite tables (create_all won't alter)."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    alters = [
        ("files", "mtime", "FLOAT"),
        ("files", "content_fingerprint", "VARCHAR(64)"),
        ("files", "content_indexed", "INTEGER DEFAULT 0"),
        ("files", "index_source", "VARCHAR(32) DEFAULT 'manual'"),
        ("files", "root_id", "VARCHAR(36)"),
        ("files", "error_message", "TEXT"),
    ]
    with engine.begin() as conn:
        for table, column, coltype in alters:
            existing = {
                row[1]
                for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
            }
            if column not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}"))
                logger.info("Added column %s.%s", table, column)


def init_db() -> None:
    from backend.app.models import file as _file_models  # noqa: F401
    from backend.app.models import indexing as _indexing_models  # noqa: F401

    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    try:
        _migrate_sqlite_columns()
    except Exception as exc:
        logger.warning("SQLite migration skipped/failed: %s", exc)

    try:
        from backend.app.indexing.fts import ensure_fts

        db = SessionLocal()
        try:
            ensure_fts(db)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("FTS init skipped: %s", exc)

    logger.info("Database tables created successfully.")


def check_db_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("Database connection check failed: %s", exc)
        return False
