# DiscoveryTrackAI - Product Requirements Document

## Original Problem Statement
Migrate DiscoveryTrackAI from Replit (Express.js/TypeScript/PostgreSQL) to Emergent platform (React/FastAPI/MongoDB). The application is an Infoblox customer discovery and technical assessment questionnaire tool with AI-powered analysis.

## Tech Stack
- **Frontend**: React (JSX), Tailwind CSS, TanStack Query, wouter, Shadcn/UI
- **Backend**: Python FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Google Gemini 3 Flash via emergentintegrations library (Emergent LLM Key)

## Core Architecture
```
/app/
├── backend/
│   ├── server.py            # All API endpoints, DB models, 91 questions
├── frontend/src/
│   ├── App.js               # Router (wouter)
│   ├── contexts/
│   │   └── DiscoveryContext.jsx  # Central state (answers, notes, DCs, sites, auto-save)
│   ├── components/
│   │   ├── CustomerDetail.jsx    # Main page (header, Quick Capture, 6 tabs, VersionControl)
│   │   ├── AssessmentQuestions.jsx  # Section renderer with Enable toggles, notes
│   │   ├── MeetingNotesAI.jsx   # AI meeting notes analysis
│   │   └── sizing/              # Token Calculator module
│   │       ├── calculators/     # TD NIOS, Dossier, Lookalike, SiteConfiguration, etc.
│   │       ├── constants.js, parsers.js, calculations.js
│   │       └── index.js
│   ├── lib/
│   │   ├── questions.js         # 91 questions client-side
│   │   ├── tokenData.js         # Token models, server guardrails
│   │   └── queryClient.js
│   └── pages/
│       ├── Customers.jsx
│       └── Dashboard.jsx
```

## DB Schema
- **customers**: `{ id, name, nickname, opportunity, seName, status, psar, arb, design, createdAt, updatedAt }`
- **discovery_data**: `{ customerId, answers, notes, meetingNotes, contextFields, enabledSections, udsMembers, leaseTimeUnits, dataCenters, sites, lastSaved }`

## What's Implemented

### Phase 1 — Base Migration (Complete)
- FastAPI backend with MongoDB, Customer CRUD, Dashboard
- Basic questionnaire, YAML/CSV export, Cloud sync, Gemini AI, Dark mode

### Phase 2 — Full Migration (Complete - Feb 6, 2026)
- 91 questions across 12 sections
- Token Calculator (TD Cloud, NIOS, Reporting, Dossier, Lookalike, Domain Takedown, SOC Insights)
- Site Configuration, UDDI Estimator, Conditional question visibility

### Phase 3 — UI Rewrite to Match Replit (Complete - Feb 6, 2026)
- DiscoveryContext with auto-save to MongoDB
- Customer header with inline edit, Platform Chosen badges
- Quick Capture bar with DC/Site management, per-item KW, auto-sync to answers
- 6 tabs: Discovery, Sizing, Tokens, SmartFill, Import, Versions
- Per-section Enable/Disable + Enable All Sections
- Per-question notes, SmartFill (MeetingNotesAI + ContextFields), Import (JSON/YAML/CSV)
- Version Control: auto-saves (10 slots) + named revisions (5 slots) with restore

## Pending / Backlog

### P1
- UDS Members Table (grid member management)
- Advanced Token Calculator summary (site-level auto-sizing, partner SKU, BOM)
- ARB-Required question tagging

### P2
- AI Discovery Assistant (industry-specific follow-up questions)
- Backend route refactoring

## Test Reports
- iteration_5.json: Post-migration (91 questions, 12 sections)
- iteration_6.json: Full UI rewrite (Quick Capture, 6 tabs, Platform badges, auto-save)
