"""Database connection module.

Provides Motor collection handles for use across routes.
Reads MONGO_URL and DB_NAME from environment.

Note: load_dotenv() must be called in the entry point (server.py)
before this module is imported so environment variables are set.
"""

import os

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "discovery_track_ai")

_client = AsyncIOMotorClient(MONGO_URL)
_db = _client[DB_NAME]

customers_collection = _db["customers"]
discovery_collection = _db["discovery_data"]
revisions_collection = _db["discovery_revisions"]
meetings_collection = _db["meetings"]
speakers_collection = _db["speakers"]


async def ensure_indexes() -> None:
    """Create indexes for commonly queried fields. Safe to call on every startup (no-op if already exists)."""
    await customers_collection.create_index("id", unique=True, background=True)
    await discovery_collection.create_index("customerId", unique=True, background=True)
    await revisions_collection.create_index("customerId", unique=True, background=True)
    await meetings_collection.create_index("customerId", background=True)
