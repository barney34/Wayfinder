# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions assessment with sections
- Quick Capture bar (DC/Site entry, IP Calculator) - **now collapsible with summary**
- Sizing table with editable fields (IPs, Role, Services, Platform, Model, Tokens)
- Token calculations with service impact, Hub/Spoke topology
- GM Sizing & Guardrails
- SmartFill AI (Gemini 3 Flash via Emergent LLM Key)
- **Value Framework** - 3 Infoblox value categories (Optimize, Accelerate, Protect) with discovery questions, pain points, solutions, and AI value proposition generation
- History/Versioning: Auto-save (2s debounce) + named revisions (localStorage)
- Export: CSV, YAML, Excel, PDF, Drawing export
- Deployment mode switching (NIOS/UDDI/Hybrid) with role/model auto-conversion
- "Why this model?" detailed sizing rationale dialog

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py
│   │   └── valueFramework.py (NEW - 3 value categories)
│   ├── models/schemas.py
│   ├── routes/
│   │   ├── ai.py (updated - /api/value-framework, /api/generate-value-props)
│   │   ├── customers.py
│   │   └── discovery.py
│   └── server.py
└── frontend/src/
    ├── components/
    │   ├── TopBar.jsx (updated - collapsible with summary)
    │   ├── AppSidebar.jsx
    │   ├── CustomerDetail.jsx
    │   ├── FloatingSaveButton.jsx
    │   ├── ImportExportSection.jsx
    │   ├── PlatformSelection.jsx
    │   ├── ValueFramework.jsx (NEW - Value Framework UI)
    │   ├── VersionControl.jsx
    │   └── sizing/calculators/
    │       ├── TokenCalculatorSummary.jsx (445 lines - refactored)
    │       ├── SiteTableRow.jsx (extracted)
    │       ├── SizingTableHeader.jsx (extracted)
    │       ├── SizingDialogs.jsx (extracted)
    │       ├── SizingExports.js (extracted)
    │       ├── platformConfig.js
    │       └── tokenUtils.js
    ├── contexts/DiscoveryContext.jsx (updated - saveToServer)
    └── lib/
        ├── revisionHelpers.js
        └── tokenData.js
```

## Tech Stack
- Frontend: React, Vite, Tailwind CSS, shadcn/ui, React Query, xlsx, jsPDF
- Backend: FastAPI, Motor (async MongoDB)
- Database: MongoDB
- 3rd Party: Gemini 3 Flash (Emergent LLM Key) for SmartFill & Value Propositions

## What's Been Completed
- Full UI/UX migration from source
- All sizing calculations and token logic
- Customer CRUD + discovery data persistence
- Save/revision system (P0 bug fixed Feb 13, 2026)
- TokenCalculatorSummary componentization (1575 → 445 lines, Feb 13, 2026)
- **Value Framework integration** (3 categories, 39 discovery questions, AI generation, Feb 19, 2026)
- **Collapsible TopBar** with summary stats (Feb 19, 2026)
- Backend modularization (routes, models, data)
- Frontend modularization (extracted VersionControl, ImportExportSection, etc.)

## Key API Endpoints
- GET /api/value-framework - Returns all 3 value categories with questions, pain points, solutions
- POST /api/generate-value-props - AI generates customer-specific value propositions per category
- POST /api/generate-context - AI generates context summaries (environment, outcomes, endState)
- POST /api/analyze-notes - AI extracts answers from meeting notes
- PUT /api/customers/{id}/discovery - Save discovery data
- GET /api/customers - List all customers

## Backlog
- P2: AI Discovery Assistant enhancements (industry-specific follow-up questions)
