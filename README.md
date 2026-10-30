# Recall — Personal Digital Search Engine

Recall is an intelligent desktop digital search engine for Windows 11 (compatible with Linux) that enables users to search for text and information inside screenshots, images, PDFs, documents, and notes.

---

## 🏛️ System Architecture

Recall utilizes a modern, decoupled architecture separating the native desktop UI from high-performance document processing and database indexing:

```text
Recall/
├── apps/
│   └── windows/                  # Electron + React Desktop Application
│       ├── electron/             # Main process & contextIsolation preload bridge
│       │   ├── main.ts
│       │   └── preload.ts
│       ├── src/                  # React 18 TypeScript application
│       │   ├── components/       # Reusable Windows 11-inspired UI elements
│       │   │   ├── FileCard.tsx
│       │   │   ├── SearchBar.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── StatsCard.tsx
│       │   │   └── StatusBadge.tsx
│       │   ├── pages/            # 7 Application Views
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Search.tsx
│       │   │   ├── AllFiles.tsx
│       │   │   ├── Images.tsx
│       │   │   ├── PDFs.tsx
│       │   │   ├── Notes.tsx
│       │   │   └── Settings.tsx
│       │   ├── layouts/
│       │   ├── services/         # API client & backend adapter
│       │   └── hooks/            # useApi, useDebounce
│       ├── package.json
│       └── vite.config.ts
│
├── backend/                      # Python FastAPI Application
│   └── app/
│       ├── api/v1/               # Versioned REST API endpoints
│       │   ├── endpoints/
│       │   │   ├── health.py     # Healthcheck & DB ping
│       │   │   ├── files.py      # File metadata registration & background triggers
│       │   │   ├── search.py     # Text search with contextual snippets
│       │   │   └── stats.py      # Aggregate file & indexing metrics
│       │   └── router.py
│       ├── database/             # SQLAlchemy connection & WAL mode config
│       │   └── connection.py
│       ├── models/               # SQLAlchemy ORM models (Files, Metadata, Content, Notes)
│       │   └── file.py
│       ├── schemas/              # Pydantic validation models
│       │   └── file.py
│       ├── services/             # Orchestration & background workers
│       │   ├── file_service.py
│       │   ├── ocr_service.py
│       │   └── pdf_service.py
│       └── main.py               # Application factory & CORS
│
├── core/                         # Content Extraction Engines
│   ├── ocr/                      # Tesseract OCR engine wrapper
│   │   └── engine.py
│   ├── pdf/                      # PyMuPDF text extraction engine
│   │   └── extractor.py
│   ├── indexing/
│   └── search/
│
├── database/                     # SQLite database storage (recall.db)
├── docs/                         # Architecture & design documentation
├── scripts/                      # Verification and test suites
│   ├── test_ocr.py               # Tesseract OCR test script
│   ├── test_pdf.py               # PyMuPDF text extractor test script
│   └── test_api_direct.py        # End-to-end integration test suite
│
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** v18+ & **npm**
- **Python** 3.11+
- **Tesseract OCR** (bundled in `bin/tesseract` or installed on system)

---

### 2. Backend Setup

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux / macOS:
   source .venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database & Start Backend**:
   ```bash
   uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   The backend API will be available at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend & Desktop Setup

1. **Install dependencies**:
   ```bash
   cd apps/windows
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Launch the Electron desktop application**:
   ```bash
   npm run electron:dev
   ```

4. **Build production bundle**:
   ```bash
   npm run build
   ```

---

## 🧪 Verification & Testing

Recall includes automated test suites covering OCR, PDF text extraction, database transactions, and FastAPI endpoints.

Run the test suites with:

```bash
# 1. Test PyMuPDF PDF Text Extraction:
python scripts/test_pdf.py

# 2. Test Tesseract OCR Engine:
python scripts/test_ocr.py

# 3. Test Full Backend End-to-End Flow (DB, OCR, PDF, Endpoints):
python scripts/test_api_direct.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | API & SQLite connectivity healthcheck |
| `GET` | `/api/v1/stats` | Aggregated counts, storage usage, and status breakdown |
| `GET` | `/api/v1/files` | Paginated file listing with optional `file_type` filtering |
| `POST` | `/api/v1/files` | Register a file and enqueue asynchronous background extraction |
| `GET` | `/api/v1/search` | Text search across extracted content with context snippets |

---

## 🔒 Security Architecture

- **Electron Security**:
  - `nodeIntegration: false` enforced.
  - `contextIsolation: true` enabled.
  - Context bridge exposes strictly typed IPC communication without granting Node.js primitives to the renderer.
- **Background Execution**:
  - Content extraction (OCR & PyMuPDF) is executed in non-blocking background workers, ensuring the desktop UI remains 60 FPS responsive.
- **Database Safety**:
  - SQLite WAL (Write-Ahead Logging) mode enabled for high-performance concurrent readers.
  - Foreign key constraints enforced (`PRAGMA foreign_keys=ON`).
