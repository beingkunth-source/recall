# Build Recall Windows installer + portable exe (UI + backend sidecar)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Installing Python packaging tools..." -ForegroundColor Cyan
.\.venv\Scripts\python.exe -m pip install -q pyinstaller watchdog python-docx openpyxl python-pptx

Write-Host "==> Building backend sidecar (PyInstaller)..." -ForegroundColor Cyan
$BackendOut = Join-Path $Root "apps\windows\resources\backend"
New-Item -ItemType Directory -Force -Path $BackendOut | Out-Null

# Clean previous sidecar
Remove-Item -Recurse -Force (Join-Path $BackendOut "*") -ErrorAction SilentlyContinue

.\.venv\Scripts\pyinstaller.exe `
  --noconfirm `
  --clean `
  --onedir `
  --name recall-server `
  --distpath $BackendOut `
  --workpath (Join-Path $Root "build\pyinstaller") `
  --specpath (Join-Path $Root "build\pyinstaller") `
  --hidden-import uvicorn.logging `
  --hidden-import uvicorn.loops `
  --hidden-import uvicorn.loops.auto `
  --hidden-import uvicorn.protocols `
  --hidden-import uvicorn.protocols.http `
  --hidden-import uvicorn.protocols.http.auto `
  --hidden-import uvicorn.protocols.websockets.auto `
  --hidden-import uvicorn.lifespan.on `
  --hidden-import sqlalchemy.dialects.sqlite `
  --hidden-import multipart `
  --hidden-import pydantic `
  --hidden-import docx `
  --hidden-import openpyxl `
  --hidden-import pptx `
  --collect-submodules backend `
  --collect-submodules core `
  backend_entry.py

# Flatten: electron expects resources/backend/recall-server.exe
$BuiltDir = Join-Path $BackendOut "recall-server"
if (Test-Path $BuiltDir) {
  Copy-Item -Force (Join-Path $BuiltDir "*") $BackendOut -Recurse
  # Keep nested folder too for pyinstaller layout; also ensure exe at top
  if (Test-Path (Join-Path $BuiltDir "recall-server.exe")) {
    Copy-Item -Force (Join-Path $BuiltDir "recall-server.exe") (Join-Path $BackendOut "recall-server.exe")
  }
}

Write-Host "==> Installing Electron builder deps..." -ForegroundColor Cyan
Set-Location (Join-Path $Root "apps\windows")
npm install --silent

Write-Host "==> Building Electron renderer + main..." -ForegroundColor Cyan
npm run build

Write-Host "==> Packaging Windows .exe installer + portable..." -ForegroundColor Cyan
npx electron-builder --win nsis portable --x64

Write-Host ""
Write-Host "Done. Artifacts in apps\windows\release\" -ForegroundColor Green
Write-Host "  - Recall-Setup-*-x64.exe     (installer with Start Menu + Desktop shortcuts)"
Write-Host "  - Recall-Portable-*-x64.exe  (single portable executable)"
Write-Host "  - win-unpacked\Recall.exe    (unpacked app folder)"
Get-ChildItem (Join-Path $Root "apps\windows\release") -File | Format-Table Name, Length, LastWriteTime
