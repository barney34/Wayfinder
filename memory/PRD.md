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
- **Value Framework Injection** — seed questions injected into discovery sections with contextual follow-ups (Dec 2025)
- History/Versioning: Auto-save + named revisions
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid)
- QPS auto-calculation, DDNS prefix field, dynamic DHCP redundancy
- External DNS vendor multiselect (13 providers + freeform)

## Value Framework Integration (Completed Dec 2025)
- **Seed Questions**: 1-2 VF questions per discovery section based on section-specific tags
  - IPAM tag → IPAM section (IP tracking, conflicts, asset visibility)
  - IDNS tag → Internal DNS section (AD-integrated, BIND, zone management)
  - EDNS tag → External DNS section (public DNS, availability, lookalike domains)
  - DHCP tag → DHCP section (scopes, leases, redundancy)
  - CLOUD tag → Cloud Management section (multi-cloud, automation)
  - SECURITY tag → Security section (threats, incidents, DNS security)
- **Follow-up Questions**: Triggered when seed questions are answered
- **Framing Messages**: Contextual insights explaining why follow-ups are relevant
- **Category Badges**: Optimize (blue), Accelerate (emerald), Protect (amber)
- **Persistence**: VF answers stored with vf- prefix and saved with customer data

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py (Cloud Management section)
│   │   └── valueFramework.py (3 VF categories with discovery questions)
│   ├── models/schemas.py
│   ├── routes/ (ai.py, customers.py, discovery.py)
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx (collapsible, auto-UDDI, auto-deployment model)
    │   ├── AssessmentQuestions.jsx (nav pills, collapsible sections, QPS auto-fill, VF injection)
    │   ├── ValueFramework.jsx (standalone VF tab)
    │   ├── ValueFrameworkInjection.jsx (VF seed questions in discovery sections)
    │   ├── CustomerDetail.jsx
    │   └── sizing/calculators/ (TokenCalculatorSummary + extracted modules)
    ├── contexts/DiscoveryContext.jsx
    └── lib/ (questions.js, tokenData.js, revisionHelpers.js)
```

## Backlog
- P2: AI Discovery Assistant enhancements
- P3: AssessmentQuestions.jsx refactoring (extract scroll-spy logic to custom hook)
