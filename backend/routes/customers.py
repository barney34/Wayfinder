"""
Customer CRUD Routes
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status

from models.schemas import CustomerCreate, CustomerUpdate, customer_doc_to_response

router = APIRouter(prefix="/api/customers", tags=["customers"])


def get_collections():
    """Get database collections - imported at runtime to avoid circular imports"""
    from server import customers_collection, discovery_collection
    return customers_collection, discovery_collection


@router.get("")
async def get_customers():
    """Get all customers"""
    customers_collection, _ = get_collections()
    cursor = customers_collection.find({}, {"_id": 0})
    customers = await cursor.to_list(length=1000)
    return [customer_doc_to_response(c) for c in customers]


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    """Get a single customer by ID"""
    customers_collection, _ = get_collections()
    customer = await customers_collection.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_doc_to_response(customer)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate):
    """Create a new customer"""
    customers_collection, _ = get_collections()
    now = datetime.now(timezone.utc)
    customer_doc = {
        "id": str(uuid.uuid4()),
        "name": customer.name,
        "nickname": customer.nickname,
        "opportunity": customer.opportunity,
        "seName": customer.seName,
        "psar": customer.psar,
        "arb": customer.arb,
        "design": customer.design,
        "createdAt": now,
        "updatedAt": now,
    }
    await customers_collection.insert_one(customer_doc)
    return customer_doc_to_response(customer_doc)


@router.patch("/{customer_id}")
async def update_customer(customer_id: str, updates: CustomerUpdate):
    """Update a customer"""
    customers_collection, _ = get_collections()
    # Find existing customer first
    existing = await customers_collection.find_one({"id": customer_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Build update dict from non-None fields
    update_data = {}
    if updates.name is not None:
        update_data["name"] = updates.name
    if updates.nickname is not None:
        update_data["nickname"] = updates.nickname
    if updates.opportunity is not None:
        update_data["opportunity"] = updates.opportunity
    if updates.seName is not None:
        update_data["seName"] = updates.seName
    if updates.psar is not None:
        update_data["psar"] = updates.psar
    if updates.arb is not None:
        update_data["arb"] = updates.arb
    if updates.design is not None:
        update_data["design"] = updates.design
    
    update_data["updatedAt"] = datetime.now(timezone.utc)
    
    await customers_collection.update_one(
        {"id": customer_id},
        {"$set": update_data}
    )
    
    # Return updated document
    updated = await customers_collection.find_one({"id": customer_id}, {"_id": 0})
    return customer_doc_to_response(updated)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str):
    """Delete a customer"""
    customers_collection, discovery_collection = get_collections()
    result = await customers_collection.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    # Also delete discovery data
    await discovery_collection.delete_one({"customerId": customer_id})
    return None
