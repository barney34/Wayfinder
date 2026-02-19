# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with sections
- Quick Capture bar (DC/Site entry, IP Calculator) — **collapsible with summary**
- **Collapsible discovery sections** with arrow toggle, sticky nav bar, active section emphasis
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- GM Sizing & Guardrails
- SmartFill AI (Gemini 3 Flash via Emergent LLM Key)
- **Value Framework** — 3 Infoblox value categories with discovery questions and AI value proposition generation
- History/Versioning: Auto-save + named revisions
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid) with role/model auto-conversion
- "Why this model?" detailed sizing rationale dialog
- **QPS auto-calculation** (aggregate = IPs/3, per-server = aggregate/servers)
- **DDNS prefix field** with `<` checkbox
- **External DNS vendor multiselect** (Akamai, AT&T, Cloudflare, GoDaddy, NS1, Dyn, ClouDNS, Route53, Google Cloud DNS + freeform)
- **DHCP Redundancy** — dynamic dropdown: F/O for NIOS, AAP/AP/AA for UDDI, all 4 for Hybrid

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py
│   │   └── valueFramework.py
│   ├── models/schemas.py
│   ├── routes/
│   │   ├── ai.py
│   │   ├── customers.py
│   │   └── discovery.py
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx (collapsible)
    │   ├── AssessmentQuestions.jsx (collapsible sections, nav bar, QPS auto, DDNS prefix, DHCP redundancy)
    │   ├── AppSidebar.jsx
    │   ├── CustomerDetail.jsx
    │   ├── FloatingSaveButton.jsx
    │   ├── ValueFramework.jsx
    │   ├── VersionControl.jsx
    │   └── sizing/calculators/
    │       ├── TokenCalculatorSummary.jsx (445 lines)
    │       ├── SiteTableRow.jsx
    │       ├── SizingTableHeader.jsx
    │       ├── SizingDialogs.jsx
    │       ├── SizingExports.js
    │       ├── platformConfig.js
    │       └── tokenUtils.js
    ├── contexts/DiscoveryContext.jsx
    └── lib/
        ├── questions.js (updated field types)
        ├── revisionHelpers.js
        └── tokenData.js
```

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, React Query, xlsx, jsPDF
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- 3rd Party: Gemini 3 Flash (Emergent LLM Key) for SmartFill & Value Propositions

## Completed This Session (Feb 2026)
- P0 Save/Revision bug fix (saveToServer, onSave prop, formatRevisionDate import)
- TokenCalculatorSummary componentization (1575 → 445 lines)
- Collapsible TopBar with summary stats
- Value Framework in SmartFill (3 categories, 39 questions, AI generation)
- Discovery section UX overhaul:
  - Collapsible sections (arrow toggle, independent of On/Off)
  - Active section visual prominence
  - Sticky section nav bar with pill buttons
  - QPS auto-calculation (aggregate = IPs/3, per-server = aggregate/servers)
  - DDNS prefix number field with < checkbox
  - External DNS vendor multiselect (13 vendors + freeform)
  - DHCP Redundancy dynamic options by platform mode

## Backlog
- P2: Value Framework question injection (seed questions → contextual follow-ups based on responses)
- P2: AI Discovery Assistant enhancements
