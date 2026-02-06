# DiscoveryTrackAI - Product Requirements Document

## Original Problem Statement
Migrate DiscoveryTrackAI from Replit (Express.js/TypeScript/PostgreSQL) to Emergent platform (React/FastAPI/MongoDB). The application is an Infoblox customer discovery and technical assessment questionnaire tool with AI-powered analysis.

## Tech Stack
- **Frontend**: React (JSX), Tailwind CSS, TanStack Query, wouter, Shadcn/UI
- **Backend**: Python FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Google Gemini via emergentintegrations library

## Core Architecture
```
/app/
├── backend/
│   ├── server.py            # All API endpoints, DB models, 91 questions
│   └── tests/
├── frontend/src/
│   ├── App.js               # Router (wouter)
│   ├── contexts/
│   │   └── DiscoveryContext.jsx  # Central state (answers, notes, DCs, sites, auto-save)
│   ├── components/
│   │   ├── CustomerDetail.jsx    # Main page (header, Quick Capture, 6 tabs)
│   │   ├── AssessmentQuestions.jsx  # Section renderer with Enable toggles, notes
│   │   ├── MeetingNotesAI.jsx   # AI meeting notes analysis
│   │   └── sizing/              # Token Calculator module
│   │       ├── calculators/     # TD NIOS, Dossier, Lookalike, etc.
│   │       ├── constants.js, parsers.js, calculations.js
│   │       └── index.js
│   ├── lib/
│   │   ├── questions.js         # 91 questions client-side
│   │   ├── tokenData.js         # Token models, server guardrails
│   │   └── queryClient.js
│   └── pages/
│       ├── Customers.jsx
│       └── Dashboard.jsx
└── memory/
    └── PRD.md
```

## DB Schema
- **customers**: `{ id, name, nickname, opportunity, seName, status, psar, arb, design, createdAt, updatedAt }`
- **discovery_data**: `{ customerId, answers, notes, meetingNotes, contextFields, enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites, lastSaved }`

## What's Implemented

### Phase 1 — Base Migration (Complete)
- FastAPI backend with MongoDB
- Customer CRUD, Dashboard, Customer list
- Basic questionnaire, YAML/CSV export, Cloud sync
- Gemini AI integration, Dark mode toggle

### Phase 2 — Full Migration (Complete - Feb 6, 2026)
- **91 questions** across **12 sections**
- **Token Calculator**: TD Cloud, TD for NIOS, Reporting, Dossier, Lookalike, Domain Takedown, SOC Insights, Summary
- **Site Configuration**, **UDDI Estimator**
- **Conditional question visibility** (yesno + multiselect)

### Phase 3 — UI Rewrite to Match Replit (Complete - Feb 6, 2026)
- **DiscoveryContext** — Central state management with auto-save (2s debounce) to MongoDB
- **Customer header** — Inline-editable Customer/Opportunity names, Platform Chosen badges
- **Quick Capture bar** — DC/Site management + KW × Mult = IPs calculator with Known IPs override
- **6 tabs**: Discovery, Sizing, Tokens, SmartFill, Import, Versions
- **Per-section Enable/Disable** with confirmation dialog + "Enable All Sections" master toggle
- **Per-question notes** — Collapsible note field per question
- **SmartFill tab** — MeetingNotesAI (upload + AI analysis) + Context Fields (AI-generated summaries)
- **Import tab** — JSON/YAML/CSV file import
- **Versions tab** — Clear Data button (data management)
- **Multiselect** with permissions (R/W, R/O) and vendor tagging
- **Lease time** with unit conversion (seconds/minutes/hours/days)

## Pending / Backlog

### P1 — Feature Enhancements
- ARB-Required question tagging with validation gates
- Version control (auto-saves + named revisions with restore)
- UDS Members Table (grid member management)
- Advanced Token Calculator summary (site-level auto-sizing, partner SKU, BOM)

### P2 — Polish & Extras
- AI Discovery Assistant (industry-specific follow-up questions)
- Backend route refactoring (split server.py into modules)

## Test Reports
- iteration_1-4.json: Pre-migration tests
- iteration_5.json: Post-migration validation (91 questions, 12 sections)
- iteration_6.json: Full UI rewrite validation (100% pass - Quick Capture, 6 tabs, Platform badges, auto-save)
