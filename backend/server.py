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
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Add backend directory to path for module imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# ========== Configuration ==========
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "discovery_track_ai")

# ========== App Setup ==========
app = FastAPI(title="DiscoveryTrackAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Database Connection ==========
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
customers_collection = db["customers"]
discovery_collection = db["discovery_data"]

# ========== Health Check ==========
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ========== Import and Register Routes ==========
from routes.customers import router as customers_router
from routes.discovery import router as discovery_router
from routes.ai import router as ai_router

app.include_router(customers_router)
app.include_router(discovery_router)
app.include_router(ai_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
