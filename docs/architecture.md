# Recall — Technical Architecture & Design Document

## 1. Overview

Recall is a local-first personal search engine desktop application. This document details the technical implementation of the Week 1 Foundation.

---

## 2. Component Architecture

### A. Electron Desktop Interface (`apps/windows`)
- **Main Process (`electron/main.ts`)**: Controls BrowserWindow creation, application lifecycle, and acts as an authenticated IPC proxy for backend calls using native Electron `net.request`.
- **Preload Bridge (`electron/preload.ts`)**: Implements `contextBridge.exposeInMainWorld('recall', ...)` with strict type safety.
- **Renderer (`src/`)**: Built on React 18, Vite, and Tailwind CSS.
  - Windows 11-inspired design with minimal neutral tones (`#f8fafc`, `#ffffff`) and green accents (`#22c55e`).
  - Implements 7 responsive views: Dashboard, Search, All Files, Images, PDFs, Notes, and Settings.
  - Reusable components: `Sidebar`, `SearchBar`, `FileCard`, `StatsCard`, and `StatusBadge`.

### B. FastAPI Backend Service (`backend/app`)
- **FastAPI Core**: Lightweight asynchronous ASGI application serving REST endpoints.
- **Non-Blocking Background Tasks**: Heavy computation (image OCR and PDF parsing) runs as asynchronous background tasks.
- **CORS Middleware**: Pre-configured to allow local development on ports 5173, 3000, and 8080.

### C. Core Processing Layer (`core/`)
- **OCR Engine (`core/ocr/engine.py`)**:
  - Wraps Tesseract OCR with automatic fallback discovery across project local binaries and standard Windows install paths.
  - Computes word-level and mean character confidence scores.
- **PDF Extractor (`core/pdf/extractor.py`)**:
  - Leverages PyMuPDF for page-by-page text extraction.
  - Handles corrupt, protected, or empty PDFs with structured failure responses.

---

## 3. Data Model

The SQLite database (`database/recall.db`) uses the following schema:

```
[files]
  - id (UUID, PK)
  - filename (VARCHAR)
  - file_type (VARCHAR: image, pdf, note, document)
  - file_size (INTEGER)
  - local_path (VARCHAR)
  - sha256_hash (VARCHAR, Indexed)
  - mime_type (VARCHAR)
  - indexing_status (VARCHAR: pending, processing, completed, failed)
  - created_at (DATETIME)
  - updated_at (DATETIME)

[file_metadata]
  - id (UUID, PK)
  - file_id (UUID, FK -> files.id)
  - key (VARCHAR)
  - value (TEXT)

[extracted_content]
  - id (UUID, PK)
  - file_id (UUID, FK -> files.id)
  - content_text (TEXT)
  - content_type (VARCHAR: ocr, pdf_text, note)
  - page_number (INTEGER, Nullable)
  - confidence (FLOAT, Nullable)
  - extracted_at (DATETIME)

[notes]
  - id (UUID, PK)
  - title (VARCHAR)
  - content (TEXT)
  - created_at (DATETIME)
  - updated_at (DATETIME)
```

---

## 4. Content Indexing Lifecycle

```
[User / Drag & Drop]
        │
        ▼
[POST /api/v1/files] ──► Persist file record (status="pending")
        │
        ├──► Return 201 Created (Immediate Response)
        │
        ▼
[Background Task Triggered]
        │
        ├─► If Image ──► OCREngine.extract_text() ──► Persist extracted_content (type="ocr")
        │
        └─► If PDF   ──► PDFExtractor.extract_text() ──► Persist extracted_content (type="pdf_text")
        │
        ▼
[Update file status] ──► status = "completed" (or "failed")
```
