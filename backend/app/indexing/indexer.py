"""
Background local indexer: discover → extract → FTS upsert → watch.

Runs in daemon threads so FastAPI / Electron stay responsive.
Never modifies original files; never uploads content.
"""

from __future__ import annotations

import hashlib
import logging
import os
import string
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from queue import Empty, Queue
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.database.connection import SessionLocal
from backend.app.indexing.defaults import (
    DEFAULT_EXCLUDED_NAMES,
    DEFAULT_EXCLUDED_PREFIXES,
    HASH_SAMPLE_BYTES,
    METADATA_ONLY_EXTENSIONS,
    SUPPORTED_EXTENSIONS,
)
from backend.app.indexing.extractors import extract_content
from backend.app.indexing.fts import ensure_fts, fts_delete, fts_upsert
from backend.app.models.file import ExtractedContent, File, _utcnow
from backend.app.models.indexing import IndexExclusion, IndexerState, IndexRoot

logger = logging.getLogger(__name__)


def _norm(path: str) -> str:
    return os.path.normcase(os.path.abspath(path))


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass
class IndexerStats:
    status: str = "idle"  # idle | scanning | indexing | paused | error
    files_discovered: int = 0
    files_indexed: int = 0
    files_pending: int = 0
    files_failed: int = 0
    files_skipped: int = 0
    queue_size: int = 0
    current_file: str = ""
    last_scan_at: Optional[str] = None
    error: str = ""
    roots: list[str] = field(default_factory=list)


class LocalIndexer:
    def __init__(self, workers: int = 2) -> None:
        self._workers = max(1, min(workers, 4))
        self._queue: Queue[str] = Queue()
        self._stop = threading.Event()
        self._pause = threading.Event()
        self._pause.set()  # not paused
        self._lock = threading.Lock()
        self.stats = IndexerStats()
        self._executor: Optional[ThreadPoolExecutor] = None
        self._scan_thread: Optional[threading.Thread] = None
        self._worker_threads: list[threading.Thread] = []
        self._watcher = None
        self._started = False
        self._exclusion_names: set[str] = set(DEFAULT_EXCLUDED_NAMES)
        self._exclusion_prefixes: list[str] = list(DEFAULT_EXCLUDED_PREFIXES)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        if self._started:
            return
        self._started = True
        self._stop.clear()
        self._reload_exclusions()
        db = SessionLocal()
        try:
            ensure_fts(db)
            self._seed_default_exclusions(db)
            # Resume pending work
            pending = (
                db.query(File.local_path)
                .filter(File.indexing_status.in_(["pending", "processing"]))
                .filter(File.index_source == "auto")
                .all()
            )
            for (p,) in pending:
                self._queue.put(p)
            roots = db.query(IndexRoot).filter(IndexRoot.enabled.is_(True)).all()
            self.stats.roots = [r.path for r in roots]
        finally:
            db.close()

        for _ in range(self._workers):
            t = threading.Thread(target=self._worker_loop, daemon=True, name="recall-indexer")
            t.start()
            self._worker_threads.append(t)

        # Start watchers for existing roots
        self._restart_watcher()
        logger.info("LocalIndexer started (%d workers)", self._workers)

    def stop(self) -> None:
        self._stop.set()
        self._pause.set()
        if self._watcher:
            try:
                self._watcher.stop()
            except Exception:
                pass
            self._watcher = None
        self._started = False
        logger.info("LocalIndexer stopped")

    def pause(self) -> None:
        self._pause.clear()
        with self._lock:
            self.stats.status = "paused"
        self._set_state("status", "paused")

    def resume(self) -> None:
        self._pause.set()
        with self._lock:
            if self.stats.status == "paused":
                self.stats.status = "indexing" if self._queue.qsize() else "idle"
        self._set_state("status", "running")

    # ------------------------------------------------------------------
    # Roots / exclusions
    # ------------------------------------------------------------------

    def list_drives(self) -> list[dict]:
        drives = []
        if os.name == "nt":
            for letter in string.ascii_uppercase:
                root = f"{letter}:\\"
                if os.path.exists(root):
                    drives.append({"path": root, "label": f"Local Disk ({letter}:)", "exists": True})
        else:
            drives.append({"path": "/", "label": "Root", "exists": True})
            home = str(Path.home())
            drives.append({"path": home, "label": "Home", "exists": True})
        return drives

    def add_root(self, path: str) -> IndexRoot:
        path = _norm(path)
        if not os.path.isdir(path):
            raise ValueError(f"Not a directory: {path}")
        db = SessionLocal()
        try:
            existing = db.query(IndexRoot).filter(IndexRoot.path == path).first()
            if existing:
                existing.enabled = True
                db.commit()
                db.refresh(existing)
                root = existing
            else:
                root = IndexRoot(path=path, enabled=True)
                db.add(root)
                db.commit()
                db.refresh(root)
            self.stats.roots = [
                r.path for r in db.query(IndexRoot).filter(IndexRoot.enabled.is_(True)).all()
            ]
        finally:
            db.close()
        self._restart_watcher()
        return root

    def remove_root(self, root_id: str, *, delete_indexed: bool = False) -> None:
        db = SessionLocal()
        try:
            root = db.query(IndexRoot).filter(IndexRoot.id == root_id).first()
            if not root:
                return
            if delete_indexed:
                files = db.query(File).filter(File.root_id == root_id).all()
                for f in files:
                    fts_delete(db, f.id)
                    db.delete(f)
            db.delete(root)
            db.commit()
            self.stats.roots = [
                r.path for r in db.query(IndexRoot).filter(IndexRoot.enabled.is_(True)).all()
            ]
        finally:
            db.close()
        self._restart_watcher()

    def list_roots(self) -> list[IndexRoot]:
        db = SessionLocal()
        try:
            return db.query(IndexRoot).order_by(IndexRoot.created_at.asc()).all()
        finally:
            db.close()

    def add_exclusion(self, pattern: str, kind: str = "prefix") -> IndexExclusion:
        pattern = pattern.strip()
        if kind == "prefix":
            pattern = _norm(pattern)
        db = SessionLocal()
        try:
            row = (
                db.query(IndexExclusion)
                .filter(IndexExclusion.pattern == pattern)
                .first()
            )
            if row:
                return row
            row = IndexExclusion(pattern=pattern, kind=kind)
            db.add(row)
            db.commit()
            db.refresh(row)
        finally:
            db.close()
        self._reload_exclusions()
        return row

    def remove_exclusion(self, exclusion_id: str) -> None:
        db = SessionLocal()
        try:
            row = db.query(IndexExclusion).filter(IndexExclusion.id == exclusion_id).first()
            if row:
                db.delete(row)
                db.commit()
        finally:
            db.close()
        self._reload_exclusions()

    def list_exclusions(self) -> list[IndexExclusion]:
        db = SessionLocal()
        try:
            return db.query(IndexExclusion).order_by(IndexExclusion.created_at.asc()).all()
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Scan / rebuild / clear
    # ------------------------------------------------------------------

    def start_scan(self, *, full: bool = False) -> None:
        if self._scan_thread and self._scan_thread.is_alive():
            return
        self._pause.set()
        self._scan_thread = threading.Thread(
            target=self._scan_all_roots, kwargs={"full": full}, daemon=True, name="recall-scan"
        )
        self._scan_thread.start()

    def rebuild_index(self) -> None:
        """Re-queue every auto-indexed file for reprocessing."""
        db = SessionLocal()
        try:
            files = db.query(File).filter(File.index_source == "auto").all()
            for f in files:
                f.indexing_status = "pending"
                f.content_fingerprint = None
                self._queue.put(f.local_path)
            db.commit()
        finally:
            db.close()
        self.resume()
        self.start_scan(full=True)

    def clear_index(self) -> None:
        db = SessionLocal()
        try:
            files = db.query(File).filter(File.index_source == "auto").all()
            for f in files:
                fts_delete(db, f.id)
                db.delete(f)
            db.execute(
                __import__("sqlalchemy").text("DELETE FROM file_fts")
            )  # safe if empty
            db.commit()
            with self._lock:
                self.stats.files_indexed = 0
                self.stats.files_discovered = 0
                self.stats.files_failed = 0
                self.stats.files_pending = 0
        except Exception:
            db.rollback()
            # FTS table might not exist yet
            db.commit()
        finally:
            db.close()
        # Drain queue
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except Empty:
                break

    def get_status(self) -> dict:
        db = SessionLocal()
        try:
            total_auto = db.query(File).filter(File.index_source == "auto").count()
            completed = (
                db.query(File)
                .filter(File.index_source == "auto", File.indexing_status == "completed")
                .count()
            )
            pending = (
                db.query(File)
                .filter(
                    File.index_source == "auto",
                    File.indexing_status.in_(["pending", "processing"]),
                )
                .count()
            )
            failed = (
                db.query(File)
                .filter(File.index_source == "auto", File.indexing_status == "failed")
                .count()
            )
            storage = (
                db.query(File)
                .filter(File.index_source == "auto")
                .with_entities(File.file_size)
                .all()
            )
            total_bytes = sum(s[0] or 0 for s in storage)
            roots = [
                {
                    "id": r.id,
                    "path": r.path,
                    "enabled": r.enabled,
                    "last_scan_at": r.last_scan_at.isoformat() if r.last_scan_at else None,
                    "files_discovered": r.files_discovered,
                    "files_indexed": r.files_indexed,
                }
                for r in db.query(IndexRoot).all()
            ]
            exclusions = [
                {"id": e.id, "pattern": e.pattern, "kind": e.kind}
                for e in db.query(IndexExclusion).all()
            ]
        finally:
            db.close()

        with self._lock:
            status = self.stats.status
            current = self.stats.current_file
            last_scan = self.stats.last_scan_at
            err = self.stats.error

        return {
            "status": status,
            "files_discovered": total_auto,
            "files_indexed": completed,
            "files_pending": pending,
            "files_failed": failed,
            "files_remaining": pending,
            "queue_size": self._queue.qsize(),
            "current_file": current,
            "last_scan_at": last_scan,
            "indexed_bytes": total_bytes,
            "error": err,
            "paused": not self._pause.is_set(),
            "roots": roots,
            "exclusions": exclusions,
            "drives": self.list_drives(),
        }

    def enqueue_path(self, path: str) -> None:
        if self._is_excluded(path):
            return
        self._queue.put(_norm(path))

    def remove_path(self, path: str) -> None:
        path = _norm(path)
        db = SessionLocal()
        try:
            f = db.query(File).filter(File.local_path == path).first()
            if f:
                fts_delete(db, f.id)
                db.delete(f)
                db.commit()
        finally:
            db.close()

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _set_state(self, key: str, value: str) -> None:
        db = SessionLocal()
        try:
            row = db.query(IndexerState).filter(IndexerState.key == key).first()
            if row:
                row.value = value
                row.updated_at = _utcnow()
            else:
                db.add(IndexerState(key=key, value=value))
            db.commit()
        finally:
            db.close()

    def _seed_default_exclusions(self, db: Session) -> None:
        existing = {e.pattern.lower() for e in db.query(IndexExclusion).all()}
        for name in DEFAULT_EXCLUDED_NAMES:
            if name not in existing:
                db.add(IndexExclusion(pattern=name, kind="name"))
        for prefix in DEFAULT_EXCLUDED_PREFIXES:
            if prefix not in existing:
                db.add(IndexExclusion(pattern=prefix, kind="prefix"))
        db.commit()

    def _reload_exclusions(self) -> None:
        db = SessionLocal()
        try:
            rows = db.query(IndexExclusion).all()
            names = set(DEFAULT_EXCLUDED_NAMES)
            prefixes = list(DEFAULT_EXCLUDED_PREFIXES)
            for r in rows:
                if r.kind == "name":
                    names.add(r.pattern.lower())
                else:
                    prefixes.append(os.path.normcase(r.pattern))
            self._exclusion_names = names
            self._exclusion_prefixes = prefixes
        finally:
            db.close()

    def _is_excluded(self, path: str) -> bool:
        norm = _norm(path)
        lower = norm.lower()

        # Never exclude an explicitly selected root folder itself.
        root_lowers = [_norm(r).lower() for r in self.stats.roots]
        if lower in root_lowers:
            return False

        for prefix in self._exclusion_prefixes:
            pref = os.path.normcase(prefix).lower().rstrip("\\/")
            if lower == pref or lower.startswith(pref + os.sep):
                # Still allow if this path lives under a user-selected root
                # that is more specific than the exclusion (e.g. Documents).
                under_allowed_root = any(
                    lower == rr or lower.startswith(rr.rstrip("\\/") + os.sep)
                    for rr in root_lowers
                )
                if under_allowed_root and not any(
                    rr == pref or rr.startswith(pref + os.sep) for rr in root_lowers
                ):
                    # User root is outside this excluded prefix — keep checking names
                    pass
                elif under_allowed_root:
                    # User selected something inside an excluded prefix (unusual); allow
                    break
                else:
                    return True

        parts = Path(norm).parts
        for part in parts:
            name = part.lower().strip("\\/")
            if len(part) == 2 and part.endswith(":"):
                continue
            if name in self._exclusion_names:
                return True
        return False

    def _scan_all_roots(self, full: bool = False) -> None:
        with self._lock:
            self.stats.status = "scanning"
            self.stats.error = ""
        db = SessionLocal()
        try:
            roots = db.query(IndexRoot).filter(IndexRoot.enabled.is_(True)).all()
            self.stats.roots = [r.path for r in roots]
            for root in roots:
                self._scan_root(db, root, full=full)
                root.last_scan_at = _utcnow_naive()
                db.commit()
            # Remove missing files under these roots
            self._reconcile_deletions(db, roots)
            now = datetime.now(timezone.utc).isoformat()
            with self._lock:
                self.stats.last_scan_at = now
                self.stats.status = "indexing" if self._queue.qsize() else "idle"
        except Exception as exc:
            logger.exception("scan failed")
            with self._lock:
                self.stats.status = "error"
                self.stats.error = str(exc)
        finally:
            db.close()

    def _scan_root(self, db: Session, root: IndexRoot, *, full: bool) -> None:
        discovered = 0
        queued = 0
        root_path = root.path
        for dirpath, dirnames, filenames in os.walk(root_path):
            if self._stop.is_set():
                return
            # prune excluded dirs in-place
            kept = []
            for d in dirnames:
                full_d = os.path.join(dirpath, d)
                if self._is_excluded(full_d):
                    continue
                kept.append(d)
            dirnames[:] = kept

            for name in filenames:
                path = os.path.join(dirpath, name)
                if self._is_excluded(path):
                    continue
                ext = os.path.splitext(name)[1].lower()
                if ext not in SUPPORTED_EXTENSIONS and ext not in METADATA_ONLY_EXTENSIONS:
                    # Still index metadata for unknown types under selected roots
                    pass
                discovered += 1
                try:
                    st = os.stat(path)
                except OSError:
                    continue
                existing = db.query(File).filter(File.local_path == _norm(path)).first()
                fingerprint = self._fingerprint(path, st.st_mtime, st.st_size)
                if existing and not full:
                    if (
                        existing.content_fingerprint == fingerprint
                        and existing.indexing_status == "completed"
                    ):
                        continue
                    existing.file_size = st.st_size
                    existing.mtime = st.st_mtime
                    existing.indexing_status = "pending"
                    existing.root_id = root.id
                    db.commit()
                    self._queue.put(_norm(path))
                    queued += 1
                elif existing and full:
                    existing.indexing_status = "pending"
                    existing.content_fingerprint = None
                    db.commit()
                    self._queue.put(_norm(path))
                    queued += 1
                else:
                    file_type, _ = self._classify(path)
                    rec = File(
                        filename=name,
                        file_type=file_type,
                        file_size=st.st_size,
                        local_path=_norm(path),
                        mime_type=None,
                        indexing_status="pending",
                        mtime=st.st_mtime,
                        index_source="auto",
                        root_id=root.id,
                        content_indexed=0,
                    )
                    db.add(rec)
                    try:
                        db.commit()
                    except Exception:
                        db.rollback()
                        # race / unique
                        continue
                    self._queue.put(_norm(path))
                    queued += 1

                if discovered % 200 == 0:
                    root.files_discovered = discovered
                    db.commit()
                    with self._lock:
                        self.stats.files_discovered = discovered
                        self.stats.queue_size = self._queue.qsize()

        root.files_discovered = discovered
        db.commit()
        logger.info("Scanned %s: discovered=%d queued=%d", root_path, discovered, queued)

    def _reconcile_deletions(self, db: Session, roots: list[IndexRoot]) -> None:
        root_paths = [_norm(r.path) for r in roots]
        files = db.query(File).filter(File.index_source == "auto").all()
        for f in files:
            under = any(
                f.local_path.lower().startswith(rp.lower().rstrip("\\/") + os.sep)
                or f.local_path.lower() == rp.lower()
                for rp in root_paths
            )
            if not under:
                continue
            if not os.path.exists(f.local_path):
                fts_delete(db, f.id)
                db.delete(f)
        db.commit()

    def _classify(self, path: str) -> tuple[str, str]:
        ext = os.path.splitext(path)[1].lower()
        if ext in SUPPORTED_EXTENSIONS:
            return SUPPORTED_EXTENSIONS[ext]
        if ext in METADATA_ONLY_EXTENSIONS:
            return "document", "none"
        return "document", "none"

    def _fingerprint(self, path: str, mtime: float, size: int) -> str:
        h = hashlib.sha256()
        h.update(f"{mtime}|{size}|".encode())
        try:
            with open(path, "rb") as fh:
                h.update(fh.read(HASH_SAMPLE_BYTES))
        except OSError:
            pass
        return h.hexdigest()

    def _worker_loop(self) -> None:
        while not self._stop.is_set():
            self._pause.wait(timeout=0.5)
            if self._stop.is_set():
                break
            if not self._pause.is_set():
                continue
            try:
                path = self._queue.get(timeout=0.5)
            except Empty:
                with self._lock:
                    if self.stats.status == "indexing" and self._queue.qsize() == 0:
                        self.stats.status = "idle"
                        self.stats.current_file = ""
                continue
            try:
                with self._lock:
                    self.stats.status = "indexing"
                    self.stats.current_file = path
                    self.stats.queue_size = self._queue.qsize()
                self._index_one(path)
            except Exception:
                logger.exception("index failed for %s", path)
            finally:
                self._queue.task_done()

    def _index_one(self, path: str) -> None:
        path = _norm(path)
        if not os.path.isfile(path):
            self.remove_path(path)
            return
        if self._is_excluded(path):
            return

        db = SessionLocal()
        try:
            ensure_fts(db)
            st = os.stat(path)
            fingerprint = self._fingerprint(path, st.st_mtime, st.st_size)
            name = os.path.basename(path)
            file_type, extractor = self._classify(path)

            rec = db.query(File).filter(File.local_path == path).first()
            if rec is None:
                # find matching root
                root_id = None
                for r in db.query(IndexRoot).filter(IndexRoot.enabled.is_(True)).all():
                    rp = _norm(r.path).lower()
                    if path.lower().startswith(rp.rstrip("\\/") + os.sep) or path.lower() == rp:
                        root_id = r.id
                        break
                rec = File(
                    filename=name,
                    file_type=file_type,
                    file_size=st.st_size,
                    local_path=path,
                    indexing_status="processing",
                    mtime=st.st_mtime,
                    index_source="auto",
                    root_id=root_id,
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)
            else:
                if (
                    rec.content_fingerprint == fingerprint
                    and rec.indexing_status == "completed"
                ):
                    return
                rec.indexing_status = "processing"
                rec.filename = name
                rec.file_type = file_type
                rec.file_size = st.st_size
                rec.mtime = st.st_mtime
                rec.error_message = None
                db.commit()

            # Clear old extracted content
            db.query(ExtractedContent).filter(ExtractedContent.file_id == rec.id).delete()
            db.commit()

            text, content_type, confidence = extract_content(path, extractor)
            content_indexed = 0
            if text:
                db.add(
                    ExtractedContent(
                        file_id=rec.id,
                        content_text=text,
                        content_type=content_type,
                        confidence=confidence,
                    )
                )
                content_indexed = 1
            elif extractor == "none":
                # metadata-only is success
                content_indexed = 0

            # Always index filename + path in FTS; content when available
            fts_body = text or ""
            fts_upsert(
                db,
                file_id=rec.id,
                filename=name,
                local_path=path,
                file_type=file_type,
                content=fts_body,
            )

            rec.content_fingerprint = fingerprint
            rec.content_indexed = content_indexed
            rec.indexing_status = "completed"
            # If extractor expected content but got none for supported rich types, still completed (metadata searchable)
            db.commit()

            with self._lock:
                self.stats.files_indexed += 1
        except Exception as exc:
            logger.exception("Failed indexing %s", path)
            try:
                rec = db.query(File).filter(File.local_path == path).first()
                if rec:
                    rec.indexing_status = "failed"
                    rec.error_message = str(exc)[:500]
                    db.commit()
            except Exception:
                db.rollback()
            with self._lock:
                self.stats.files_failed += 1
        finally:
            db.close()

    def _restart_watcher(self) -> None:
        try:
            from backend.app.indexing.watcher import IndexWatcher
        except Exception:
            return
        if self._watcher:
            try:
                self._watcher.stop()
            except Exception:
                pass
        roots = self.stats.roots or [
            r.path for r in self.list_roots() if r.enabled
        ]
        if not roots:
            self._watcher = None
            return
        self._watcher = IndexWatcher(
            roots,
            on_created=self.enqueue_path,
            on_modified=self.enqueue_path,
            on_deleted=self.remove_path,
            is_excluded=self._is_excluded,
        )
        self._watcher.start()


# Process-wide singleton
indexer = LocalIndexer(workers=2)
