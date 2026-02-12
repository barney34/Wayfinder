"""
Pydantic Models for the Discovery API
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


# ========== Customer Models ==========
class CustomerBase(BaseModel):
    name: str
    nickname: str = ""
    opportunity: str = ""
    seName: str = Field(default="", alias="se_name")
    psar: str = "not-submitted"
    arb: str = "not-submitted"
    design: str = "not-started"

    class Config:
        populate_by_name = True


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    opportunity: Optional[str] = None
    seName: Optional[str] = Field(default=None, alias="se_name")
    psar: Optional[str] = None
    arb: Optional[str] = None
    design: Optional[str] = None

    class Config:
        populate_by_name = True


class CustomerResponse(CustomerBase):
    id: str
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")

    class Config:
        populate_by_name = True


# ========== AI Analysis Models ==========
class AnalyzeNotesRequest(BaseModel):
    notes: str


class AnalyzeNotesMatch(BaseModel):
    questionId: str
    answer: str
    confidence: str


class AnalyzeNotesResponse(BaseModel):
    matches: List[AnalyzeNotesMatch]


class GenerateContextRequest(BaseModel):
    contextType: str
    answers: Dict[str, str]
    notes: Dict[str, str] = {}
    meetingNotes: str = ""


class GenerateContextResponse(BaseModel):
    summary: str


# ========== Discovery Data Models ==========
class DiscoveryData(BaseModel):
    answers: Dict[str, str] = {}
    notes: Dict[str, str] = {}
    meetingNotes: str = ""
    contextFields: Dict[str, str] = {}
    enabledSections: Dict[str, bool] = {}
    udsMembers: List[Dict] = []
    leaseTimeUnits: Dict[str, str] = {}
    dataCenters: List[Dict] = []
    sites: List[Dict] = []


class DiscoveryDataResponse(BaseModel):
    customerId: str
    answers: Dict[str, str] = {}
    notes: Dict[str, str] = {}
    meetingNotes: str = ""
    contextFields: Dict[str, str] = {}
    enabledSections: Dict[str, bool] = {}
    lastSaved: Optional[datetime] = None


# ========== Helper Functions ==========
def customer_doc_to_response(doc: dict) -> dict:
    """Convert MongoDB document to response dict"""
    return {
        "id": doc["id"],
        "name": doc["name"],
        "nickname": doc.get("nickname", ""),
        "opportunity": doc.get("opportunity", ""),
        "seName": doc.get("seName", doc.get("se_name", "")),
        "psar": doc.get("psar", "not-submitted"),
        "arb": doc.get("arb", "not-submitted"),
        "design": doc.get("design", "not-started"),
        "createdAt": doc.get("createdAt", doc.get("created_at", datetime.now(timezone.utc))),
        "updatedAt": doc.get("updatedAt", doc.get("updated_at", datetime.now(timezone.utc))),
    }
