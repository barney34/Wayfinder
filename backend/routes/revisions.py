"""
Revision Management Routes
Manages rolling (10-slot) and named (5-slot) revision history per customer.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from database import customers_collection, revisions_collection
from models.schemas import AddRevisionRequest, PromoteRevisionRequest, RenameRevisionRequest

router = APIRouter(prefix="/api/customers", tags=["revisions"])

MAX_DYNAMIC = 10
MAX_PERSONAL = 5


async def _get_storage(customer_id: str) -> dict:
    doc = await revisions_collection.find_one({"customerId": customer_id}, {"_id": 0})
    if not doc:
        return {"customerId": customer_id, "dynamic": [], "personal": []}
    return doc


async def _save_storage(customer_id: str, storage: dict):
    await revisions_collection.update_one(
        {"customerId": customer_id},
        {"$set": storage},
        upsert=True,
    )


@router.get("/{customer_id}/revisions")
async def get_revisions(customer_id: str):
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await _get_storage(customer_id)


@router.post("/{customer_id}/revisions")
async def add_revision(customer_id: str, data: AddRevisionRequest):
    """Add a new rolling revision (capped at MAX_DYNAMIC, oldest dropped)."""
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    storage = await _get_storage(customer_id)
    new_rev = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "exportedAt": data.exportedAt,
        "format": data.format,
        "payload": data.payload,
    }
    storage["dynamic"].insert(0, new_rev)
    storage["dynamic"] = storage["dynamic"][:MAX_DYNAMIC]
    await _save_storage(customer_id, storage)
    return new_rev


@router.put("/{customer_id}/revisions/{revision_id}/promote")
async def promote_revision(customer_id: str, revision_id: str, data: PromoteRevisionRequest):
    """Promote a dynamic revision to a named personal revision (capped at MAX_PERSONAL)."""
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    storage = await _get_storage(customer_id)
    idx = next((i for i, r in enumerate(storage["dynamic"]) if r["id"] == revision_id), -1)
    if idx == -1:
        raise HTTPException(status_code=404, detail="Revision not found")

    if len(storage["personal"]) >= MAX_PERSONAL:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_PERSONAL} named revisions allowed")

    promoted = {**storage["dynamic"][idx], "id": str(uuid.uuid4()), "name": data.name}
    storage["dynamic"].pop(idx)
    storage["personal"].insert(0, promoted)
    storage["personal"] = storage["personal"][:MAX_PERSONAL]
    await _save_storage(customer_id, storage)
    return promoted


@router.put("/{customer_id}/revisions/{revision_id}/rename")
async def rename_revision(customer_id: str, revision_id: str, data: RenameRevisionRequest):
    """Rename a named personal revision."""
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    storage = await _get_storage(customer_id)
    rev = next((r for r in storage["personal"] if r["id"] == revision_id), None)
    if not rev:
        raise HTTPException(status_code=404, detail="Named revision not found")

    rev["name"] = data.name
    await _save_storage(customer_id, storage)
    return rev


@router.delete("/{customer_id}/revisions/{revision_id}")
async def delete_revision(customer_id: str, revision_id: str):
    """Delete a revision from either list."""
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    storage = await _get_storage(customer_id)
    before = len(storage["dynamic"]) + len(storage["personal"])
    storage["dynamic"] = [r for r in storage["dynamic"] if r["id"] != revision_id]
    storage["personal"] = [r for r in storage["personal"] if r["id"] != revision_id]
    if len(storage["dynamic"]) + len(storage["personal"]) == before:
        raise HTTPException(status_code=404, detail="Revision not found")

    await _save_storage(customer_id, storage)
    return {"ok": True}
