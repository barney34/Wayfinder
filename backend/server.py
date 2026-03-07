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
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import ensure_indexes


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
