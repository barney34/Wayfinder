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
│   ├── server.py          # All API endpoints, DB models, questions data
│   └── tests/             # Pytest tests
├── frontend/src/
│   ├── App.js             # Router (wouter)
│   ├── components/
│   │   ├── CustomerDetail.jsx  # Core questionnaire UI (~950 lines)
│   │   ├── sizing/             # Token Calculator module
│   │   │   ├── calculators/    # TD NIOS, Dossier, Lookalike, etc.
│   │   │   ├── constants.js
│   │   │   ├── parsers.js
│   │   │   └── calculations.js
│   │   └── ThemeToggle.jsx
│   ├── lib/
│   │   ├── tokenData.js        # Token models, server guardrails
│   │   └── queryClient.js
│   └── pages/
│       └── Customers.jsx
└── memory/
    └── PRD.md
```

## DB Schema
- **customers**: `{ id, name, nickname, opportunity, seName, status, psar, arb, design, createdAt, updatedAt }`
- **discovery_data**: `{ customerId, answers, notes, meetingNotes, contextFields, enabledSections, lastSaved }`

## What's Implemented (as of Feb 6, 2026)

### Phase 1 — Base Migration (Complete)
- FastAPI backend with MongoDB
- Customer CRUD (create, read, update, delete)
- Dashboard with customer list, grouped by SE
- Basic questionnaire with ~48 questions
- YAML & CSV export
- Cloud sync (save/load to MongoDB)
- Gemini AI integration (meeting notes analysis)
- Dark mode toggle

### Phase 2 — Full Migration (Complete - Feb 6, 2026)
- **91 questions** across **12 sections**: Users-Devices-Sites, Sizing Data, IPAM, UDDI, Internal DNS, External DNS, DHCP, Services, Microsoft Management, Asset/Network Insight, Security, Professional Services
- **Token Calculator** (Security section): TD Cloud, TD for NIOS, Reporting, Dossier, Lookalike Monitoring, Domain Takedown, SOC Insights, Summary Token Count
- **Site Configuration** tool: add/remove sites with IPs, roles, platforms, DHCP%
- **UDDI Estimator**: knowledge workers, devices per user, mode, server selections, calculated values
- **Conditional question visibility**: supports yesno and multiselect conditions
- **Tooltips** on questions with technical notes
- **Group/subsection labels** on questions
- Progress tracking counts only visible (non-hidden-conditional) questions

## Pending / Backlog

### P1 — Feature Enhancements
- ARB-Required question tagging with validation gates
- Real-world testing of AI Meeting Notes Analysis (Gemini)
- Advanced import/export (revision history, named saves, data import)

### P2 — Polish & Extras
- AI Discovery Assistant (industry-specific follow-up questions)
- Comprehensive E2E test suite
- Backend route refactoring (split server.py into modules)

## Test Reports
- iteration_1-4.json: Pre-migration tests (YAML/CSV export, CRUD)
- iteration_5.json: Full migration validation (100% pass - 91 questions, 12 sections, Token Calculator, conditionals, dark mode)
