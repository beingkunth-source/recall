"""
Production entrypoint for the Recall backend sidecar.
Used by PyInstaller and by Electron when launching the packaged server.
"""

from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path


def _prepare_paths() -> Path:
    if getattr(sys, "frozen", False):
        meipass = Path(getattr(sys, "_MEIPASS"))
        root = Path(sys.executable).resolve().parent
        # Ensure frozen bundle root is importable
        for p in (str(meipass), str(root)):
            if p not in sys.path:
                sys.path.insert(0, p)
    else:
        root = Path(__file__).resolve().parent
        meipass = root
        if str(root) not in sys.path:
            sys.path.insert(0, str(root))

    data_dir = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "Recall"
    data_dir.mkdir(parents=True, exist_ok=True)
    db_path = data_dir / "recall.db"
    os.environ.setdefault("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    os.environ.setdefault("RECALL_DATA_DIR", str(data_dir))

    # Keep CWD writable for SQLite side files when frozen
    try:
        os.chdir(str(data_dir if getattr(sys, "frozen", False) else root))
    except OSError:
        pass

    return data_dir


def main() -> None:
    data_dir = _prepare_paths()
    log_path = data_dir / "backend.log"

    try:
        # Import the ASGI app object directly (required for PyInstaller).
        from backend.app.main import app  # noqa: WPS433
        import uvicorn

        host = os.environ.get("RECALL_HOST", "127.0.0.1")
        port = int(os.environ.get("RECALL_PORT", "8000"))

        with open(log_path, "a", encoding="utf-8") as log:
            log.write(f"\n--- starting Recall backend on {host}:{port} ---\n")

        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="info",
            reload=False,
            workers=1,
        )
    except Exception:
        try:
            with open(log_path, "a", encoding="utf-8") as log:
                log.write(traceback.format_exc())
        except OSError:
            pass
        raise


if __name__ == "__main__":
    main()
