"""
Direct functional test of FastAPI endpoints, database, and background processing.
"""

import asyncio
import os
import sys
import tempfile
import time

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)

from fastapi import BackgroundTasks
from backend.app.database.connection import init_db, SessionLocal, check_db_connection
from backend.app.api.v1.endpoints.health import health_check
from backend.app.api.v1.endpoints.files import list_files, create_file_record
from backend.app.api.v1.endpoints.search import search
from backend.app.api.v1.endpoints.stats import get_stats
from backend.app.schemas.file import FileCreate
from PIL import Image, ImageDraw, ImageFont
from scripts.test_pdf import create_test_pdf

async def run_direct_tests():
    log("1. Initializing database schema...")
    init_db()
    db = SessionLocal()

    try:
        # Test Health
        log("2. Testing health_check()...")
        health = await health_check()
        log(f"   Health: status={health.status}, database={health.database}, version={health.version}")
        assert health.status == "healthy"
        assert health.database is True

        # Test initial stats
        log("3. Testing get_stats()...")
        stats_initial = await get_stats(db=db)
        log(f"   Stats: total_files={stats_initial.total_files}, storage_used={stats_initial.storage_used}")

        # Test initial file listing
        log("4. Testing list_files()...")
        files_list = await list_files(db=db)
        log(f"   Files: total={files_list.total}")

        # Test Image creation and OCR extraction
        log("5. Creating test image and indexing via create_file_record()...")
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
            img_path = tmp_img.name

        try:
            img = Image.new("RGB", (450, 120), color="white")
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("arial.ttf", size=32)
            except Exception:
                font = ImageFont.load_default()
            draw.text((25, 35), "Invoice Number INV-98765", fill="black", font=font)
            img.save(img_path)

            file_data = FileCreate(
                filename="test_invoice.png",
                file_type="image",
                file_size=os.path.getsize(img_path),
                local_path=img_path,
                mime_type="image/png"
            )

            bg_tasks = BackgroundTasks()
            file_resp = await create_file_record(file_data=file_data, background_tasks=bg_tasks, db=db)
            log(f"   File created: id={file_resp.id}, status={file_resp.indexing_status}")
            assert file_resp.id is not None
            assert file_resp.filename == "test_invoice.png"

            # Execute background tasks (OCR processing)
            log("   Executing background OCR task (calling Tesseract)...")
            await bg_tasks()
            log("   Background OCR task completed successfully!")

            # Verify file search
            log("6. Testing search(q='INV-98765')...")
            search_res = await search(q="INV-98765", db=db)
            log(f"   Search matches: {search_res.total}")
            assert search_res.total >= 1, "Expected at least 1 match for INV-98765"
            match = search_res.results[0]
            log(f"   Matched snippet: '{match.content_snippet}' from file: '{match.filename}'")
            assert "98765" in match.content_snippet or "Invoice" in match.content_snippet

        finally:
            if os.path.exists(img_path):
                os.remove(img_path)

        # Test PDF creation and text extraction
        log("7. Creating test PDF and indexing via create_file_record()...")
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp_pdf:
            pdf_path = tmp_pdf.name

        try:
            create_test_pdf(pdf_path)
            pdf_data = FileCreate(
                filename="contracts_quarterly.pdf",
                file_type="pdf",
                file_size=os.path.getsize(pdf_path),
                local_path=pdf_path,
                mime_type="application/pdf"
            )

            bg_tasks_pdf = BackgroundTasks()
            pdf_resp = await create_file_record(file_data=pdf_data, background_tasks=bg_tasks_pdf, db=db)
            log(f"   PDF created: id={pdf_resp.id}, status={pdf_resp.indexing_status}")

            log("   Executing background PDF extraction task (calling PyMuPDF)...")
            await bg_tasks_pdf()
            log("   Background PDF task completed successfully!")

            # Verify PDF search
            log("8. Testing search(q='sample text')...")
            pdf_search = await search(q="sample text", db=db)
            log(f"   PDF search matches: {pdf_search.total}")
            assert pdf_search.total >= 1, "Expected match for 'sample text'"
            pdf_match = pdf_search.results[0]
            log(f"   Matched PDF snippet: '{pdf_match.content_snippet}'")

        finally:
            if os.path.exists(pdf_path):
                os.remove(pdf_path)

        # Test updated stats
        log("9. Testing get_stats() after indexing...")
        stats_final = await get_stats(db=db)
        log(f"   Final stats: total_files={stats_final.total_files}, images={stats_final.total_images}, pdfs={stats_final.total_pdfs}, indexed={stats_final.total_indexed}")
        assert stats_final.total_files >= 2
        assert stats_final.total_images >= 1
        assert stats_final.total_pdfs >= 1
        assert stats_final.total_indexed >= 2

        # Test filtered list_files
        log("10. Testing list_files(file_type='image')...")
        images_only = await list_files(file_type="image", db=db)
        log(f"    Images list: total={images_only.total}")
        assert images_only.total >= 1

        print("\n[OK] All backend endpoints, database, OCR, and PDF extractions PASSED perfectly!", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_direct_tests())
