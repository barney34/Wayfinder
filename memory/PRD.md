# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with collapsible sections
- Quick Capture bar (DC/Site entry, IP Calculator) — collapsible with summary
- **Sticky section nav bar** with color-coded abbreviated pills (IPAM, I DNS, E DNS, DHCP, Cloud, Services, MSFT MGT, AI/NI, Security, PS)
- **Cloud Management section** in Discovery (Cloudflare, Akamai) — auto-selects UDDI target
- **Auto deployment model** — NIOS only→NIOS, UDDI only→UDDI, NIOS+(UDDI/Asset)→Hybrid
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- SmartFill AI + Value Framework (3 Infoblox value categories)
- History/Versioning: Auto-save + named revisions
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid)
- QPS auto-calculation, DDNS prefix field, dynamic DHCP redundancy
- External DNS vendor multiselect (13 providers + freeform)

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py (Cloud Management section)
│   │   └── valueFramework.py
│   ├── models/schemas.py
│   ├── routes/ (ai.py, customers.py, discovery.py)
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx (collapsible, auto-UDDI, auto-deployment model)
    │   ├── AssessmentQuestions.jsx (nav pills, collapsible sections, QPS auto-fill)
    │   ├── ValueFramework.jsx
    │   ├── CustomerDetail.jsx
    │   └── sizing/calculators/ (TokenCalculatorSummary + extracted modules)
    ├── contexts/DiscoveryContext.jsx
    └── lib/ (questions.js, tokenData.js, revisionHelpers.js)
```

## Backlog
- P2: Value Framework question injection (seed questions → contextual follow-ups)
- P2: AI Discovery Assistant enhancements
