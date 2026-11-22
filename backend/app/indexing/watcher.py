"""Filesystem watcher for incremental local indexing (watchdog)."""

from __future__ import annotations

import logging
from collections.abc import Callable

logger = logging.getLogger(__name__)


class IndexWatcher:
    def __init__(
        self,
        roots: list[str],
        *,
        on_created: Callable[[str], None],
        on_modified: Callable[[str], None],
        on_deleted: Callable[[str], None],
        is_excluded: Callable[[str], bool],
    ) -> None:
        self.roots = roots
        self.on_created = on_created
        self.on_modified = on_modified
        self.on_deleted = on_deleted
        self.is_excluded = is_excluded
        self._observer = None

    def start(self) -> None:
        try:
            from watchdog.events import FileSystemEventHandler
            from watchdog.observers import Observer
        except ImportError:
            logger.warning("watchdog not installed; live file monitoring disabled")
            return

        outer = self

        class Handler(FileSystemEventHandler):
            def on_created(self, event):
                if event.is_directory:
                    return
                path = event.src_path
                if outer.is_excluded(path):
                    return
                outer.on_created(path)

            def on_modified(self, event):
                if event.is_directory:
                    return
                path = event.src_path
                if outer.is_excluded(path):
                    return
                # Debounce bursts slightly by only enqueueing
                outer.on_modified(path)

            def on_deleted(self, event):
                path = getattr(event, "src_path", None)
                if not path:
                    return
                outer.on_deleted(path)

            def on_moved(self, event):
                if getattr(event, "src_path", None):
                    outer.on_deleted(event.src_path)
                dest = getattr(event, "dest_path", None)
                if dest and not event.is_directory and not outer.is_excluded(dest):
                    outer.on_created(dest)

        observer = Observer()
        handler = Handler()
        for root in self.roots:
            try:
                observer.schedule(handler, root, recursive=True)
            except Exception as exc:
                logger.warning("Could not watch %s: %s", root, exc)
        observer.daemon = True
        observer.start()
        self._observer = observer
        logger.info("Watching %d root(s) for changes", len(self.roots))

    def stop(self) -> None:
        if self._observer is None:
            return
        try:
            self._observer.stop()
            self._observer.join(timeout=3)
        except Exception:
            pass
        self._observer = None
