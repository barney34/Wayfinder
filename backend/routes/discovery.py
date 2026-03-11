"""
Discovery Data Routes
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from database import customers_collection, discovery_collection
from models.schemas import DiscoveryData
from websocket_manager import manager

router = APIRouter(prefix="/api/customers", tags=["discovery"])


@router.get("/{customer_id}/discovery")
async def get_discovery_data(customer_id: str):
    """Get discovery data for a customer"""
    
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
    
    # Broadcast update to all connected WebSocket clients
    import logging
    from datetime import datetime
    logger = logging.getLogger(__name__)
    logger.info(f"[BROADCAST] About to broadcast update for customer {customer_id}")
    logger.info(f"[BROADCAST] Active connections: {manager.get_connection_count(customer_id)}")
    
    # Convert datetime objects to ISO format strings for JSON serialization
    def serialize_doc(doc):
        if isinstance(doc, dict):
            return {k: serialize_doc(v) for k, v in doc.items()}
        elif isinstance(doc, list):
            return [serialize_doc(item) for item in doc]
        elif isinstance(doc, datetime):
            return doc.isoformat()
        else:
            return doc
    
    try:
        serialized_data = serialize_doc(discovery_doc)
        await manager.broadcast(customer_id, {
            "type": "discovery_update",
            "data": serialized_data,
            "timestamp": now.isoformat()
        })
        logger.info(f"[BROADCAST] Successfully broadcasted to customer {customer_id}")
    except Exception as e:
        logger.error(f"[BROADCAST] Failed to broadcast: {e}")
    
    return discovery_doc
