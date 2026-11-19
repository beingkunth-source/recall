"""
Recall API – FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.router import v1_router
from backend.app.api.v1.endpoints.health import router as health_router
from backend.app.api.v1.endpoints import files, indexing, search, stats
from backend.app.database.connection import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Lifespan handler (startup / shutdown)
# ------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run database initialisation and local indexer on startup."""
    logger.info("Initialising database...")
    init_db()
    logger.info("Database ready.")

    from backend.app.indexing.indexer import indexer

    try:
        indexer.start()
        # Resume scanning previously selected local folders
        if indexer.list_roots():
            indexer.start_scan(full=False)
        logger.info("Local indexer started.")
    except Exception:
        logger.exception("Failed to start local indexer")

    yield

    try:
        indexer.stop()
    except Exception:
        logger.exception("Error stopping indexer")
    logger.info("Shutting down Recall API.")


# ------------------------------------------------------------------
# Application factory
# ------------------------------------------------------------------

app = FastAPI(
    title="Recall API",
    description="Personal digital search engine – backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS – allow local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health_router)           # /health at root level
app.include_router(v1_router)               # /api/v1/*
app.include_router(files.router)            # /files (alias)
app.include_router(search.router)           # /search (alias)
app.include_router(stats.router)            # /stats (alias)
app.include_router(indexing.router)         # /indexing (alias)
