"""
Infoblox Customer Discovery & Technical Assessment System - Backend
FastAPI + MongoDB + Gemini AI
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

# ========== Configuration ==========
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "discovery_track_ai")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

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

# ========== Discovery Questions Data ==========
DISCOVERY_QUESTIONS = [
    {"id": "ud-platform", "section": "Users - Devices - Sites", "question": "Target Platform", "technicalOnly": True, "fieldType": "select", "options": ["NIOS (Physical/Virtual)", "UDDI (NIOS-X/NXaaS)", "Hybrid (NIOS GM + UDDI Members)"], "defaultValue": "NIOS (Physical/Virtual)", "tooltip": "NIOS: Physical or Virtual TE-series with HA support. UDDI: NIOS-X (virtual, no HA) or NXaaS (cloud, HA by default). Hybrid: NIOS GM/GMC for database with UDDI members serving DNS/DHCP per site.", "hidden": True},
    {"id": "ud-1", "section": "Users - Devices - Sites", "question": "Estimated number of knowledge workers", "technicalOnly": True},
    {"id": "ud-site-config", "section": "Sizing Data", "question": "Site Configuration", "technicalOnly": True, "fieldType": "siteConfiguration", "tooltip": "Configure sites with their IP allocations and roles (GM/GMC/DNS/DHCP/Discovery). GM and GMC are sized for total grid objects and listed first."},
    {"id": "ipam-0", "section": "IPAM", "question": "Who is your current platform/vendor?", "technicalOnly": False, "fieldType": "multiselect", "options": ["Spreadsheets", "Microsoft", "Bluecat", "EIP"], "allowFreeform": True},
    {"id": "ud-5", "section": "IPAM", "subsection": "Sites & Locations", "question": "# of Data Centers", "technicalOnly": False, "fieldType": "number"},
    {"id": "ud-7", "section": "IPAM", "subsection": "Sites & Locations", "question": "# of Sites", "technicalOnly": False, "fieldType": "number"},
    {"id": "ipam-multiplier", "section": "IPAM", "question": "IP Addr Multiplier / Devices per User", "technicalOnly": True, "fieldType": "select", "options": ["2.5", "3.5"], "allowFreeform": True, "defaultValue": "2.5"},
    {"id": "ud-2", "section": "IPAM", "question": "Is there a BYOD Policy in Place?", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "ud-2a", "section": "IPAM", "question": "How many devices are allowed per user?", "technicalOnly": True, "fieldType": "select", "options": ["2", "3", "4"], "allowFreeform": True, "conditionalOn": {"questionId": "ud-2", "value": "Yes"}},
    {"id": "ipam-1", "section": "IPAM", "question": "Estimated number of active IP addresses", "technicalOnly": True, "fieldType": "ipCalculated"},
    {"id": "ipam-2-toggle", "section": "IPAM", "question": "Are you considering IPv6?", "technicalOnly": False, "fieldType": "yesno"},
    {"id": "ipam-2", "section": "IPAM", "question": "Beyond sizing, what are your plans and challenges for securing and managing IPv6 application controls?", "technicalOnly": False, "conditionalOn": {"questionId": "ipam-2-toggle", "value": "Yes"}},
    {"id": "ipam-3", "section": "IPAM", "question": "Was IPv6 considered in sizing calculations?", "technicalOnly": True, "fieldType": "yesno", "conditionalOn": {"questionId": "ipam-2-toggle", "value": "Yes"}},
    {"id": "ipam-4", "section": "IPAM", "question": "Percentage of DHCP", "technicalOnly": True, "fieldType": "number", "defaultValue": "80"},
    {"id": "ipam-5", "section": "IPAM", "question": "What is your IP plan for the future?", "technicalOnly": True},
    {"id": "ipam-6", "section": "IPAM", "question": "What is your strategy to identify and eliminate unused IP addresses and orphaned assets?", "technicalOnly": False},
    {"id": "ipam-7", "section": "IPAM", "question": "Will you leverage a single, unified management platform (like a portal) for all DDI across hybrid, multi-cloud?", "technicalOnly": False},
    {"id": "ipam-8", "section": "IPAM", "question": "Will DNS be managed in Portal? Native or Hybrid", "technicalOnly": True},
    {"id": "ipam-9", "section": "IPAM", "question": "What cloud providers do you use today or in the future?", "technicalOnly": True, "fieldType": "multiselect", "options": ["AWS", "Azure", "GCP", "OCI", "Alibaba", "IBM"], "allowFreeform": True},
    {"id": "ipam-10", "section": "IPAM", "question": "What specific IT/Security systems (e.g., SIEM/SOAR/ITSM) do you need seamless, automated DDI/Security integration with?", "technicalOnly": False},
    {"id": "ipam-11", "section": "IPAM", "question": "What 3rd parties would you like to integrate?", "technicalOnly": False},
    {"id": "ipam-12", "section": "IPAM", "question": "What tools and processes do you use for continuous, real-time asset discovery (including cloud and IoT devices) across your entire network?", "technicalOnly": False},
    {"id": "uddi-1", "section": "UDDI", "group": "Cloud Management", "question": "Cloudflare management", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "uddi-4", "section": "UDDI", "group": "Cloud Management", "question": "Akamai management", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "uddi-5", "section": "UDDI", "question": "Zone transfer", "technicalOnly": True, "fieldType": "yesno", "conditionalOn": {"questionId": "uddi-4", "value": "Yes"}},
    {"id": "idns-0", "section": "Internal DNS", "question": "Who is your current platform/vendor?", "technicalOnly": True, "fieldType": "multiselect", "options": ["Microsoft", "BIND", "Bluecat", "EIP"], "allowFreeform": True},
    {"id": "idns-0a", "section": "Internal DNS", "question": "How many forests?", "technicalOnly": True, "fieldType": "number", "conditionalOn": {"questionId": "idns-0", "value": "Microsoft"}},
    {"id": "idns-servers", "section": "Internal DNS", "question": "How many servers running DNS?", "technicalOnly": True, "fieldType": "number"},
    {"id": "idns-3", "section": "Internal DNS", "question": "Number of zones", "technicalOnly": True},
    {"id": "idns-4", "section": "Internal DNS", "question": "Total number of records in all zones combined", "technicalOnly": True},
    {"id": "idns-multiplier", "section": "Internal DNS", "question": "DNS Multiplier", "technicalOnly": True, "fieldType": "select", "options": ["2.5", "3"], "allowFreeform": True, "defaultValue": "2.5"},
    {"id": "idns-2", "section": "Internal DNS", "question": "Queries per second rate, aggregate", "technicalOnly": True, "fieldType": "dnsAggregateCalculated"},
    {"id": "idns-1", "section": "Internal DNS", "question": "Queries per second rate, per server", "technicalOnly": True, "fieldType": "dnsPerServerCalculated"},
    {"id": "idns-5", "section": "Internal DNS", "question": "DDNS update per second rate", "technicalOnly": True, "fieldType": "text", "defaultValue": "<1"},
    {"id": "idns-6", "section": "Internal DNS", "question": "DDNS updates will be sourced from", "technicalOnly": True, "fieldType": "multiselect", "options": ["Client", "DHCP Server"], "defaultValue": "DHCP Server"},
    {"id": "idns-7", "section": "Internal DNS", "question": "Is MS Secure Dynamic Update (GSS-TSIG) currently implemented?", "technicalOnly": True},
    {"id": "edns-0", "section": "External DNS", "question": "Who is your current platform/vendor?", "technicalOnly": True},
    {"id": "edns-4", "section": "External DNS", "question": "Number of zones", "technicalOnly": True},
    {"id": "edns-5", "section": "External DNS", "question": "Total number of records in all zones combined", "technicalOnly": True},
    {"id": "edns-1", "section": "External DNS", "question": "Queries per second rate, per server", "technicalOnly": True},
    {"id": "edns-2", "section": "External DNS", "question": "Queries per second rate, aggregate", "technicalOnly": True},
    {"id": "edns-3", "section": "External DNS", "question": "Will DNSSEC signing be enabled for authoritative zones?", "technicalOnly": True},
    {"id": "dhcp-0", "section": "DHCP", "question": "Who is your current platform/vendor?", "technicalOnly": True, "fieldType": "multiselect", "options": ["Microsoft", "ISC", "Bluecat", "EIP"], "allowFreeform": True},
    {"id": "dhcp-0-pct", "section": "DHCP", "question": "Percentage of DHCP", "technicalOnly": True, "fieldType": "number", "defaultValue": "80"},
    {"id": "dhcp-servers", "section": "DHCP", "question": "How many DHCP servers?", "technicalOnly": True, "fieldType": "number"},
    {"id": "dhcp-scopes", "section": "DHCP", "question": "How many total scopes?", "technicalOnly": True, "fieldType": "number"},
    {"id": "dhcp-scopes-network-equipment", "section": "DHCP", "question": "Are Scopes on Network equipment?", "technicalOnly": True, "fieldType": "yesno", "defaultValue": "No"},
    {"id": "dhcp-network-equipment-types", "section": "DHCP", "question": "Network equipment types", "technicalOnly": True, "fieldType": "multiselect", "options": ["Router", "Load Balancer", "Other"], "conditionalOn": {"questionId": "dhcp-scopes-network-equipment", "value": "Yes"}},
    {"id": "dhcp-1", "section": "DHCP", "question": "What type(s) of DHCP redundancy will be implemented?", "technicalOnly": True, "fieldType": "select", "options": ["AAP", "AP", "AA", "FO"]},
    {"id": "dhcp-2", "section": "DHCP", "question": "Will DHCP update Microsoft DNS servers via GSS-TSIG?", "technicalOnly": True},
    {"id": "dhcp-3", "section": "DHCP", "question": "What is the average lease time for wireless devices?", "technicalOnly": True, "fieldType": "leaseTime", "defaultValue": "86400"},
    {"id": "dhcp-4", "section": "DHCP", "question": "What is the average lease time for wired devices?", "technicalOnly": True, "fieldType": "leaseTime", "defaultValue": "604800"},
    {"id": "dhcp-5", "section": "DHCP", "question": "What is the average lease time for IoT/OT devices, and how do you secure them without an agent?", "technicalOnly": False},
    {"id": "dhcp-6", "section": "DHCP", "question": "What is the average lease time for IoT devices?", "technicalOnly": True, "fieldType": "leaseTime", "defaultValue": "604800"},
    {"id": "dhcp-7", "section": "DHCP", "question": "Will DHCP update DNS on another platform?", "technicalOnly": True},
    {"id": "dhcp-8", "section": "DHCP", "question": "Will lease scavenging be enabled?", "technicalOnly": True},
    {"id": "dhcp-9", "section": "DHCP", "question": "Will update on lease renewal be enabled?", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "svc-1", "section": "Services", "question": "Will NTP be enabled?", "technicalOnly": True},
    {"id": "svc-2", "section": "Services", "question": "How will you centralize network data and DNS threat intelligence for your security ecosystem?", "technicalOnly": False},
    {"id": "svc-3", "section": "Services", "question": "Will the Cloud Data Connector (CDC) be used?", "technicalOnly": True},
    {"id": "svc-4", "section": "Services", "question": "Will SNMP be enabled?", "technicalOnly": True},
    {"id": "svc-5", "section": "Services", "question": "What is your strategy for centralizing and unifying DDI management across your NIOS Grid and cloud environments?", "technicalOnly": False},
    {"id": "svc-6", "section": "Services", "question": "Will NIOS Grid Connector be enabled?", "technicalOnly": True},
    {"id": "svc-7", "section": "Services", "question": "Will DNS Forwarding Proxy (DFP) on NIOS be enabled?", "technicalOnly": True},
    {"id": "svc-8", "section": "Services", "question": "Are you considering an as-a-service (SaaS) delivery model for DNS/DHCP to reduce infrastructure overhead?", "technicalOnly": False},
    {"id": "svc-9", "section": "Services", "question": "Will DNS/DHCP aaS be used?", "technicalOnly": True},
    {"id": "ms-1", "section": "Microsoft Management", "question": "Are services enabled for Microsoft Management?", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "ms-2", "section": "Microsoft Management", "question": "What specific Microsoft components are you syncing/integrating with?", "technicalOnly": True, "fieldType": "multiselect", "options": ["MS DNS", "MS DHCP", "Sites/Services", "Users", "Event Log Collection"], "allowFreeform": True, "conditionalOn": {"questionId": "ms-1", "value": "Yes"}},
    {"id": "ms-7", "section": "Microsoft Management", "question": "How many domain controllers are there?", "technicalOnly": True, "conditionalOn": {"questionId": "ms-1", "value": "Yes"}},
    {"id": "ms-8", "section": "Microsoft Management", "question": "How many forests do you have?", "technicalOnly": False, "conditionalOn": {"questionId": "ms-1", "value": "Yes"}},
    {"id": "ni-greenfield", "section": "Asset/ Network Insight", "question": "Is this green field?", "technicalOnly": True, "fieldType": "yesno"},
    {"id": "ni-1", "section": "Asset/ Network Insight", "question": "What is the total number of active devices (including IoT/OT and cloud workloads) across your entire hybrid environment?", "technicalOnly": True, "fieldType": "ipCalculated"},
    {"id": "ni-3", "section": "Asset/ Network Insight", "question": "What is the total number of SNMP/ SSH devices that will be managed/ interrogated?", "technicalOnly": True, "fieldType": "number"},
    {"id": "ni-3a", "section": "Asset/ Network Insight", "question": "What are the types of Layer 2/3 devices?", "technicalOnly": True, "fieldType": "multiselect", "options": ["Cisco", "Palo", "Juniper"], "allowFreeform": True},
    {"id": "sec-1", "section": "Security", "question": "What visibility and controls do you have to detect and block advanced threats (like ransomware or C2) that exploit the DNS layer?", "technicalOnly": False},
    {"id": "sec-2", "section": "Security", "question": "How do you ensure your security tools are not overwhelmed by false positives and are using the earliest possible threat intelligence?", "technicalOnly": False},
    {"id": "sec-3", "section": "Security", "question": "Are you concerned about lookalike domains (typosquatting), and what is your takedown strategy?", "technicalOnly": False},
    {"id": "sec-4", "section": "Security", "question": "How do you reduce SOC alert noise and ensure fast mean-time-to-respond (MTTR) to DNS-related security incidents?", "technicalOnly": False},
    {"id": "beta-enable", "section": "Security", "subsection": "Token Calculator", "question": "Enable", "technicalOnly": True, "fieldType": "enableSwitch", "defaultValue": "No"},
    {"id": "beta-asset-config", "section": "Security", "subsection": "Token Calculator", "question": "TD Cloud", "technicalOnly": True, "fieldType": "assetConfigInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-td-nios-section", "section": "Security", "subsection": "Token Calculator", "question": "TD for NIOS", "technicalOnly": True, "fieldType": "tdNiosSection", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-reporting", "section": "Security", "subsection": "Token Calculator", "question": "Reporting", "technicalOnly": True, "fieldType": "reportingInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-dossier", "section": "Security", "subsection": "Token Calculator", "group": "Add-Ons", "question": "Dossier (25 Queries per day)", "technicalOnly": True, "fieldType": "dossierInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-lookalike", "section": "Security", "subsection": "Token Calculator", "group": "Add-Ons", "question": "Lookalike Monitoring (25 Domains)", "technicalOnly": True, "fieldType": "lookalikeInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}, "tooltip": "Are you interested in lookalike domain monitoring? This helps detect typosquatting and brand impersonation."},
    {"id": "beta-domain-takedown", "section": "Security", "subsection": "Token Calculator", "group": "Add-Ons", "question": "Domain Takedown Service (packs of 100)", "technicalOnly": True, "fieldType": "domainTakedownInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-soc-insights", "section": "Security", "subsection": "Token Calculator", "group": "Add-Ons", "question": "SOC Insights", "technicalOnly": True, "fieldType": "socInsightsInput", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "beta-security-tokens-total", "section": "Security", "subsection": "Token Calculator", "question": "Summary Token Count", "technicalOnly": True, "fieldType": "tokenTotal", "conditionalOn": {"questionId": "beta-enable", "value": "Yes"}},
    {"id": "uddi-estimator", "section": "UDDI", "question": "UDDI Estimator", "technicalOnly": True, "fieldType": "uddiEstimator"},
    {"id": "ps-1", "section": "Professional Services", "question": "Are you interested in PS?", "technicalOnly": True, "fieldType": "yesno", "defaultValue": "Yes"},
    {"id": "ps-2", "section": "Professional Services", "question": "What is your comfort level on number of Go-Lives?", "technicalOnly": True, "fieldType": "number"},
    {"id": "ps-3", "section": "Professional Services", "question": "3rd Party Integrations", "technicalOnly": True, "fieldType": "multiselect", "options": ["NAC", "Vulnerability Scanner", "SIEM", "SOAR"], "allowFreeform": True},
]


# ========== Pydantic Models ==========
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


# ========== API Routes ==========

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ========== Customer CRUD ==========

@app.get("/api/customers")
async def get_customers():
    """Get all customers"""
    cursor = customers_collection.find({}, {"_id": 0})
    customers = await cursor.to_list(length=1000)
    return [customer_doc_to_response(c) for c in customers]


@app.get("/api/customers/{customer_id}")
async def get_customer(customer_id: str):
    """Get a single customer by ID"""
    customer = await customers_collection.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer_doc_to_response(customer)


@app.post("/api/customers", status_code=status.HTTP_201_CREATED)
async def create_customer(customer: CustomerCreate):
    """Create a new customer"""
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


@app.patch("/api/customers/{customer_id}")
async def update_customer(customer_id: str, updates: CustomerUpdate):
    """Update a customer"""
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


@app.delete("/api/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: str):
    """Delete a customer"""
    result = await customers_collection.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    # Also delete discovery data
    await discovery_collection.delete_one({"customerId": customer_id})
    return None


# ========== Discovery Data Routes ==========

@app.get("/api/customers/{customer_id}/discovery")
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


@app.put("/api/customers/{customer_id}/discovery")
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


# ========== AI Routes ==========

@app.get("/api/questions")
async def get_questions():
    """Get all discovery questions"""
    return DISCOVERY_QUESTIONS


@app.post("/api/analyze-notes")
async def analyze_notes(request: AnalyzeNotesRequest):
    """Analyze meeting notes and match to discovery questions using AI"""
    if not request.notes or not request.notes.strip():
        raise HTTPException(status_code=400, detail="Meeting notes are required")
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build questions list for prompt
        questions_text = "\n".join([
            f"ID: {q['id']}, Question: {q['question']}"
            for q in DISCOVERY_QUESTIONS
        ])
        
        prompt = f"""Analyze the following meeting notes and extract answers to discovery questions.

Meeting Notes:
{request.notes}

Discovery Questions:
{questions_text}

For each question that can be answered from the meeting notes, return a match with:
- questionId: the question ID
- answer: the extracted answer (concise, matching the question format)
- confidence: "high" or "medium"

Return ONLY a JSON object with format: {{ "matches": [{{"questionId": "...", "answer": "...", "confidence": "..."}}] }}"""

        # Use Gemini 3 Flash via emergentintegrations (low temperature for consistent outputs)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze-notes-{uuid.uuid4()}",
            system_message="You are an expert at extracting structured information from meeting notes."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        data = json.loads(response_text)
        return data
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {"matches": []}
    except Exception as e:
        print(f"Error analyzing notes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze meeting notes: {str(e)}")


@app.post("/api/generate-context")
async def generate_context(request: GenerateContextRequest):
    """Generate context summary using AI"""
    if not request.contextType or not request.answers:
        raise HTTPException(status_code=400, detail="Context type and answers are required")
    
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI integration not configured")
    
    try:
        # Build question-answer pairs for prompt
        answers_text_parts = []
        for question_id, answer in request.answers.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question:
                answers_text_parts.append(f"Q: {question['question']}\nA: {answer}")
        answers_text = "\n\n".join(answers_text_parts)
        
        # Build notes text
        notes_text_parts = []
        for question_id, note in request.notes.items():
            question = next((q for q in DISCOVERY_QUESTIONS if q["id"] == question_id), None)
            if question and note:
                notes_text_parts.append(f"Context for \"{question['question']}\":\n{note}")
        notes_text = "\n\n".join(notes_text_parts) if notes_text_parts else ""
        
        # Build prompt based on context type
        prompt_instructions = {
            "environment": "Summarize the customer's current technical environment, including infrastructure, systems, and technology stack.",
            "outcomes": "Summarize the desired business outcomes and goals the customer wants to achieve.",
            "endState": "Describe the target end state and desired future architecture.",
            "endstate": "Describe the target end state and desired future architecture.",
            "migration": "Outline the recommended migration path and implementation approach.",
        }.get(request.contextType, f"Generate a summary for {request.contextType}.")
        
        notes_section = f"Additional Context Notes:\n{notes_text}" if notes_text else ""
        
        prompt = f"""{prompt_instructions}

Discovery Questions and Answers:
{answers_text}

{notes_section}

Provide a concise, professional summary (2-4 paragraphs)."""

        # Use Gemini 3 Flash via emergentintegrations (low temperature for consistent outputs)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"generate-context-{uuid.uuid4()}",
            system_message="You are an expert technical consultant creating professional documentation."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"summary": response.strip()}
        
    except Exception as e:
        print(f"Error generating context: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate context summary: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
