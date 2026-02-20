# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## TopBar Component (Latest — Dec 2025)
- **Customer/Opp pill**: Auto-sizing stacked pill (Customer: on top, Opportunity: below), positioned on the left
- **Summary row**: 3 stacked sections equally spaced:
  - DC stacked over Sites (like Customer/Opp)
  - TS with solution badges stacked
  - KW stacked over IPs
- **Input cards row**: 4 cards with weighted grid (`minmax(0, 1fr) minmax(0, 1fr) minmax(150px, 0.7fr) minmax(150px, 0.7fr)`):
  - Data Centers (larger) - 2-column grid for entries
  - Sites (larger) - 2-column grid for entries  
  - Target Solutions (smaller, equal to Active IPs) - NIOS, UDDI, Security, Asset toggles + Hybrid
  - Active IPs (smaller, equal to TS) - KW input with multiplier
- **Collapsible**: Click header to collapse/expand
- **Enter to accept**: Customer/Opp fields accept on Enter key press

## IPAM Section Enhancements (Dec 2025)
- **Platform Vendor (ipam-0)**: 2-column grid layout with checkboxes (Spreadsheets, Microsoft, Bluecat, EIP + Other freeform), click away accepts
- **Cloud Providers (ipam-9)**: 3-column grid layout (AWS, Azure, GCP, OCI, Alibaba, IBM + Other freeform), click away accepts
- **DC/Sites Sync**: 
  - `# of Data Centers` (ud-5) syncs with TopBar `dataCenters.length`
  - `# of Sites` (ud-7) syncs with TopBar `sites.length`
  - Shows orange mismatch badge if counts differ (e.g., "⚠ 0 in TopBar")
- **Add Response**: 
  - Text questions show "+ Add response" button
  - Clicking expands textarea with "Examine for answers" button for SmartFill AI
  - Section-level "+ Add response" at bottom of each section for contextual notes

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions with collapsible sections, scroll-spy nav, section pills
- Cloud Management auto-selects UDDI
- Auto deployment model (NIOS/UDDI/Hybrid)
- Sizing table, Token calculations, Hub/Spoke topology
- SmartFill AI + Value Framework Injection
- History/Versioning, Export (CSV, YAML, Excel, PDF)
- QPS auto-calculation, External DNS vendor multiselect

## Architecture
```
/app
├── backend/ (Flask: server.py, routes/, data/, models/)
└── frontend/src/ (React: TopBar.jsx, AssessmentQuestions.jsx, CustomerDetail.jsx, DiscoveryContext.jsx)
```

## Backlog
- P1: Full Home Assistant UI consistency review
- P2: Keyboard shortcuts (Tab, Ctrl+S)
- P2: AI Discovery Assistant enhancements
- P3: AssessmentQuestions.jsx decomposition (800+ lines)
