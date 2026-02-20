# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with collapsible sections
- Quick Capture bar (DC/Site entry, IP Calculator) — collapsible with summary
- Sticky section nav bar with color-coded pills (IPAM, I DNS, E DNS, DHCP, Cloud, Services, MSFT MGT, AI/NI, Security, PS)
- Scroll-spy navigation — auto-highlights active section pill on scroll
- Active section prominence — colored background wash, thick border, larger title
- Cloud Management section — auto-selects UDDI target
- Auto deployment model — NIOS only=NIOS, UDDI only=UDDI, NIOS+(UDDI/Asset)=Hybrid
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- SmartFill AI + Value Framework (3 Infoblox value categories)
- Value Framework Injection — contextual follow-ups in discovery sections
- History/Versioning: Auto-save + named revisions
- Export: CSV, YAML, Excel, PDF, Drawing export
- QPS auto-calculation, DDNS prefix field, dynamic DHCP redundancy
- External DNS vendor multiselect (13 providers + freeform)

## TopBar Component (Completed Feb 2026)
- **Customer/Opportunity stacked**: Both in one pill container, Customer on top, Opportunity below, with full labels
- **Grid layout**: `5fr 5fr 3fr 3fr` — DC/Sites get wider columns, Target Solutions and Active IPs are equal-sized
- **DC/Site pills**: Grid of 3 per row (`grid-cols-3`), expands naturally into multiple rows (no scroll)
- **Target Solutions**: Renamed from "Deployment" — NIOS, UDDI, Security, Asset toggles with Hybrid auto-detection
- **Deployment Toggles**: Use correct `feature-*` keys
- **Auto Deployment Model**: NIOS+UDDI=Hybrid via useEffect + setPlatformMode
- **Hybrid Toggle**: Activates/deactivates both NIOS and UDDI together
- **+ Add buttons**: Always visible, pinned to bottom of DC/Site cards
- **IP Calculator**: Knowledge Workers x Multiplier with 0.5 increment arrows
- **Collapsible**: Click header row to toggle
- **Asset Insight Tooltip**: Shows "+Mgmt Tokens Added" when NIOS + Asset active
- **DeploymentModel removed from Sizing tab**: Fully managed in TopBar

## Architecture
```
/app
├── backend/
│   ├── data/ (questions.py, valueFramework.py)
│   ├── models/schemas.py
│   ├── routes/ (ai.py, customers.py, discovery.py)
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx
    │   ├── AssessmentQuestions.jsx
    │   ├── CustomerDetail.jsx
    │   └── ValueFrameworkInjection.jsx
    ├── contexts/DiscoveryContext.jsx
    └── lib/ (questions.js, tokenData.js, revisionHelpers.js)
```

## Backlog
- P1: Full Home Assistant UI consistency review
- P2: Keyboard shortcuts (Tab navigation, Ctrl+S save)
- P2: AI Discovery Assistant enhancements
- P3: AssessmentQuestions.jsx decomposition (800+ lines)
