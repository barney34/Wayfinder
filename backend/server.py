"""
Infoblox Customer Discovery & Technical Assessment System - Backend
FastAPI + MongoDB + Gemini AI

Refactored modular architecture:
- routes/customers.py: Customer CRUD operations
- routes/discovery.py: Discovery data operations
- routes/ai.py: AI-powered SmartFill and context generation
- models/schemas.py: Pydantic models
- data/questions.py: Discovery question definitions
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from database import ensure_indexes

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST_DIR = BASE_DIR.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


# ========== App Setup ==========
app = FastAPI(title="DiscoveryTrackAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Health Check ==========
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ========== Import and Register Routes ==========
from routes.customers import router as customers_router
from routes.discovery import router as discovery_router
from routes.ai import router as ai_router
from routes.revisions import router as revisions_router
try:
    from routes.meetings import router as meetings_router
    _meetings_available = True
except Exception:
    _meetings_available = False

app.include_router(customers_router)
app.include_router(discovery_router)
app.include_router(ai_router)
app.include_router(revisions_router)
if _meetings_available:
    app.include_router(meetings_router)

if FRONTEND_DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="assets")


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    requested_path = FRONTEND_DIST_DIR / full_path if full_path else FRONTEND_DIST_DIR / "index.html"
    if full_path and requested_path.is_file():
        return FileResponse(requested_path)

    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=503, detail="Frontend build not found")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
