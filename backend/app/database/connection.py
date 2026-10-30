"""
Database connection and session management for Recall.

Uses SQLAlchemy with SQLite backend. Enables WAL mode for better
concurrent read/write performance.
"""

import os
import logging
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session

logger = logging.getLogger(__name__)

# Database URL with fallback
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database/recall.db")

# SQLAlchemy engine configuration
# For SQLite, check_same_thread=False is required for FastAPI's async usage
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
)

# Enable WAL mode for SQLite — better concurrent read performance
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable WAL journal mode and foreign keys for every SQLite connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency that yields a database session.

    Ensures the session is properly closed after the request completes,
    even if an exception occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize the database by creating all tables defined in the models.

    This imports all model modules to ensure they are registered with the
    Base metadata before calling create_all.
    """
    # Import models so they register with Base.metadata
    from backend.app.models import file as _file_models  # noqa: F401

    # Ensure the database directory exists
    if DATABASE_URL.startswith("sqlite"):
        db_path = DATABASE_URL.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")


def check_db_connection() -> bool:
    """
    Check whether the database is reachable.

    Returns True if a simple query succeeds, False otherwise.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("Database connection check failed: %s", exc)
        return False
