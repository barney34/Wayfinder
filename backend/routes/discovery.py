"""
Discovery Data Routes
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from models.schemas import DiscoveryData

router = APIRouter(prefix="/api/customers", tags=["discovery"])


def get_collections():
    """Get database collections - imported at runtime to avoid circular imports"""
    from server import customers_collection, discovery_collection
    return customers_collection, discovery_collection


@router.get("/{customer_id}/discovery")
async def get_discovery_data(customer_id: str):
    """Get discovery data for a customer"""
    customers_collection, discovery_collection = get_collections()
    
    # Verify customer exists
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get discovery data
    discovery = await discovery_collection.find_one({"customerId": customer_id}, {"_id": 0})
    
    if not discovery:
        # Return empty discovery data
        return {
            "customerId": customer_id,
            "answers": {},
            "notes": {},
            "meetingNotes": "",
            "contextFields": {},
            "enabledSections": {},
            "lastSaved": None,
        }
    
    return discovery


@router.put("/{customer_id}/discovery")
async def save_discovery_data(customer_id: str, data: DiscoveryData):
    """Save discovery data for a customer"""
    customers_collection, discovery_collection = get_collections()
    
    # Verify customer exists
    customer = await customers_collection.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    now = datetime.now(timezone.utc)
    
    discovery_doc = {
        "customerId": customer_id,
        "answers": data.answers,
        "notes": data.notes,
        "meetingNotes": data.meetingNotes,
        "contextFields": data.contextFields,
        "enabledSections": data.enabledSections,
        "udsMembers": data.udsMembers,
        "leaseTimeUnits": data.leaseTimeUnits,
        "dataCenters": data.dataCenters,
        "sites": data.sites,
        "drawings": data.drawings,
        "activeDrawingId": data.activeDrawingId,
        "drawingConfigs": data.drawingConfigs,
        "lastSaved": now,
    }
    
    # Upsert discovery data
    await discovery_collection.update_one(
        {"customerId": customer_id},
        {"$set": discovery_doc},
        upsert=True
    )
    
    # Also update customer's updatedAt
    await customers_collection.update_one(
        {"id": customer_id},
        {"$set": {"updatedAt": now}}
    )
    
    return discovery_doc
