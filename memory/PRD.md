# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with collapsible sections
- Quick Capture bar (DC/Site entry, IP Calculator) — collapsible with summary
- **Sticky section nav bar** with color-coded abbreviated pills (IPAM, I DNS, E DNS, DHCP, Cloud, Services, MSFT MGT, AI/NI, Security, PS)
- **Scroll-spy navigation** — auto-highlights active section pill on scroll
- **Active section prominence** — colored background wash, thick border, larger title for section in focus
- **Cloud Management section** in Discovery (Cloudflare, Akamai) — auto-selects UDDI target
- **Auto deployment model** — NIOS only→NIOS, UDDI only→UDDI, NIOS+(UDDI/Asset)→Hybrid
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- SmartFill AI + Value Framework (3 Infoblox value categories)
- **Value Framework Injection** — seed questions injected into discovery sections with contextual follow-ups
- History/Versioning: Auto-save + named revisions
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid)
- QPS auto-calculation, DDNS prefix field, dynamic DHCP redundancy
- External DNS vendor multiselect (13 providers + freeform)

## TopBar Component (Completed Feb 2026)
- **Deployment Toggles**: Use correct `feature-*` keys (feature-nios, feature-uddi, feature-security, feature-asset insights)
- **Auto Deployment Model**: NIOS+UDDI=Hybrid, NIOS-only=NIOS, UDDI-only=UDDI (via useEffect + setPlatformMode)
- **Hybrid Toggle**: Activates/deactivates both NIOS and UDDI together
- **Editable Customer Name/Opportunity**: Inline editable inputs in TopBar header row, saved on blur
- **DC/Site Management**: Add/edit/delete Data Centers and Sites as inline pills
- **IP Calculator**: Knowledge Workers × Multiplier with up/down arrows (0.5 increments)
- **Collapsible**: Click header row to collapse/expand the input section
- **Asset Insight Tooltip**: Shows "+Mgmt Tokens Added" when NIOS + Asset are both active

## External DNS QPS Fix (Verified Feb 2026)
- edns-1 and edns-2 correctly use dnsPerServerCalculated/dnsAggregateCalculated field types
- Auto badge shows calculated values matching Internal DNS behavior

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py
│   │   └── valueFramework.py
│   ├── models/schemas.py
│   ├── routes/ (ai.py, customers.py, discovery.py)
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx (collapsible, editable name/opp, deployment toggles)
    │   ├── AssessmentQuestions.jsx (nav pills, collapsible sections, QPS auto-fill, VF injection)
    │   ├── CustomerDetail.jsx (passes editing props to TopBar)
    │   ├── ValueFramework.jsx
    │   ├── ValueFrameworkInjection.jsx
    │   └── sizing/calculators/
    ├── contexts/DiscoveryContext.jsx
    └── lib/ (questions.js, tokenData.js, revisionHelpers.js)
```

## Backlog
- P1: Full Home Assistant UI consistency review across all components
- P2: Keyboard shortcuts (Tab navigation, Ctrl+S save)
- P2: AI Discovery Assistant enhancements
- P3: AssessmentQuestions.jsx decomposition (800+ lines)
