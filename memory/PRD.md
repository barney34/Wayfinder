# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + Flask/FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with sections
- Quick Capture bar (DC/Site entry, IP Calculator)
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- GM Sizing & Guardrails
- SmartFill AI (Gemini 3 Flash via Emergent LLM Key)
- History/Versioning: Auto-save (2s debounce) + named revisions (localStorage)
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid) with role/model auto-conversion
- "Why this model?" detailed sizing rationale dialog

## Architecture
```
/app
├── backend/
│   ├── data/questions.py
│   ├── models/schemas.py
│   ├── routes/
│   │   ├── ai.py
│   │   ├── customers.py
│   │   └── discovery.py
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx
    │   ├── AppSidebar.jsx
    │   ├── CustomerDetail.jsx
    │   ├── FloatingSaveButton.jsx
    │   ├── ImportExportSection.jsx
    │   ├── PlatformSelection.jsx
    │   ├── VersionControl.jsx
    │   └── sizing/calculators/
    │       ├── TokenCalculatorSummary.jsx (445 lines - refactored)
    │       ├── SiteTableRow.jsx (extracted)
    │       ├── SizingTableHeader.jsx (extracted)
    │       ├── SizingDialogs.jsx (extracted)
    │       ├── SizingExports.js (extracted)
    │       ├── platformConfig.js
    │       └── tokenUtils.js
    ├── contexts/DiscoveryContext.jsx
    └── lib/
        ├── revisionHelpers.js
        └── tokenData.js
```

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, React Query, xlsx, jsPDF
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- 3rd Party: Gemini 3 Flash (Emergent LLM Key) for SmartFill

## What's Been Completed
- Full UI/UX migration from source
- All sizing calculations and token logic
- Customer CRUD + discovery data persistence
- Save/revision system (P0 bug fixed Feb 13, 2026)
- TokenCalculatorSummary componentization (1575 → 445 lines, Feb 13, 2026)
- Backend modularization (routes, models, data)
- Frontend modularization (extracted VersionControl, ImportExportSection, etc.)

## Backlog
- P2: AI Discovery Assistant enhancements (industry-specific follow-up questions)
