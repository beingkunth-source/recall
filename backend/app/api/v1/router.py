"""
API v1 router – aggregates all endpoint routers under the /api/v1 prefix.
"""

from fastapi import APIRouter

from backend.app.api.v1.endpoints import files, indexing, search, stats

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(files.router)
v1_router.include_router(search.router)
v1_router.include_router(stats.router)
v1_router.include_router(indexing.router)
