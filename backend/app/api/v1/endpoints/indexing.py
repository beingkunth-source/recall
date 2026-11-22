"""Local storage indexing API — roots, drives, scan controls, status."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.indexing.indexer import indexer

router = APIRouter(prefix="/indexing", tags=["indexing"])


class AddRootRequest(BaseModel):
    path: str = Field(..., min_length=1)


class AddExclusionRequest(BaseModel):
    pattern: str = Field(..., min_length=1)
    kind: str = Field("prefix", pattern=r"^(prefix|name)$")


def _default_root_candidates() -> list[str]:
    """Return all default folders Recall would auto-index on first launch."""
    home = Path.home()
    candidates = [
        home / "Documents",
        home / "Desktop",
        home / "Downloads",
        home / "Pictures",
        home / "Videos",
        home / "Music",
        home / "OneDrive",
        home / "OneDrive - Personal",
        home / "Google Drive",
        home / "Dropbox",
        home / "iCloudDrive",
    ]
    return [str(d) for d in candidates if d.exists() and d.is_dir()]


@router.get("/status")
async def indexing_status():
    return indexer.get_status()


@router.get("/drives")
async def list_drives():
    return {"drives": indexer.list_drives()}


@router.get("/roots")
async def list_roots():
    roots = indexer.list_roots()
    return {
        "roots": [
            {
                "id": r.id,
                "path": r.path,
                "enabled": r.enabled,
                "last_scan_at": r.last_scan_at.isoformat() if r.last_scan_at else None,
                "files_discovered": r.files_discovered,
                "files_indexed": r.files_indexed,
            }
            for r in roots
        ]
    }


@router.get("/default-roots")
async def list_default_roots():
    """Return all folders that would be auto-indexed on a fresh install."""
    return {"roots": _default_root_candidates()}


@router.post("/roots")
async def add_root(body: AddRootRequest):
    try:
        root = indexer.add_root(body.path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    # Kick off scan for the new root
    indexer.start_scan(full=False)
    return {
        "id": root.id,
        "path": root.path,
        "enabled": root.enabled,
    }


@router.post("/roots/seed-defaults")
async def seed_default_roots():
    """Add all standard user folders (Documents, Desktop, Downloads…) as index roots."""
    from backend.app.main import _seed_default_roots
    _seed_default_roots(indexer)
    indexer.start_scan(full=False)
    roots = indexer.list_roots()
    return {
        "ok": True,
        "roots": [
            {"id": r.id, "path": r.path, "enabled": r.enabled}
            for r in roots
        ],
    }


@router.delete("/roots/{root_id}")
async def remove_root(root_id: str, delete_indexed: bool = False):
    indexer.remove_root(root_id, delete_indexed=delete_indexed)
    return {"ok": True}


@router.get("/exclusions")
async def list_exclusions():
    rows = indexer.list_exclusions()
    return {
        "exclusions": [
            {"id": e.id, "pattern": e.pattern, "kind": e.kind} for e in rows
        ]
    }


@router.post("/exclusions")
async def add_exclusion(body: AddExclusionRequest):
    row = indexer.add_exclusion(body.pattern, body.kind)
    return {"id": row.id, "pattern": row.pattern, "kind": row.kind}


@router.delete("/exclusions/{exclusion_id}")
async def remove_exclusion(exclusion_id: str):
    indexer.remove_exclusion(exclusion_id)
    return {"ok": True}


@router.post("/start")
async def start_indexing(full: bool = False):
    indexer.resume()
    indexer.start_scan(full=full)
    return {"ok": True, "status": indexer.get_status()["status"]}


@router.post("/pause")
async def pause_indexing():
    indexer.pause()
    return {"ok": True, "status": "paused"}


@router.post("/resume")
async def resume_indexing():
    indexer.resume()
    return {"ok": True, "status": indexer.get_status()["status"]}


@router.post("/rebuild")
async def rebuild_index():
    indexer.rebuild_index()
    return {"ok": True}


@router.post("/clear")
async def clear_index():
    indexer.clear_index()
    return {"ok": True}
