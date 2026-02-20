# Sizing Planner - Product Requirements Document

## Original Problem Statement
Migration and enhancement of a "Sizing" calculator application for infrastructure planning. The goal is a faithful conversion of the original tool's features while adding significant user-driven enhancements.

## Core Product Requirements
1. **Full UI/UX Parity**: Match source code layout with "Quick Capture" bar, multi-tab interface, platform toggles
2. **Full Data and Logic Migration**: Port all business logic including sizing calculations
3. **Feature: History/Versioning**: Auto-save and named revisions
4. **Feature: SmartFill**: AI-powered content generation for discovery questions
5. **Feature: Hub & Spoke Sizing**: Advanced sizing logic for topologies
6. **Feature: GM Sizing & Guardrails**: Grid Master sizing with object counts and service warnings
7. **Feature: Detailed Sizing Rationale**: UI elements explaining hardware recommendations
8. **Feature: Export**: Excel export in specific format
9. **UI/UX Overhaul**: Home Assistant-inspired dark theme
10. **Feature: Value Framework Integration**: Contextual value-based questions in discovery
11. **Feature: Conversational Value Discovery**: AI-powered chat interface for discovery (NEW)

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Flask/FastAPI
- **Database**: MongoDB
- **AI**: Gemini 3 Flash via Emergent LLM Key

## Architecture
```
/app
├── backend/
│   ├── data/
│   │   ├── questions.py      # Backend source of truth for questions
│   │   └── valueFramework.py # Value framework definitions
│   ├── routes/
│   │   ├── ai.py             # AI endpoints including value-discovery-chat
│   │   ├── customers.py
│   │   └── discovery.py
│   └── server.py
└── frontend/
    └── src/
        ├── components/
        │   ├── TopBar.jsx
        │   ├── AssessmentQuestions.jsx
        │   ├── ChatValueDiscovery.jsx   # NEW - Conversational discovery
        │   └── sizing/
        ├── contexts/
        │   └── DiscoveryContext.jsx
        └── lib/
            └── questions.js   # Static frontend copy (sync issue)
```

## What's Been Implemented

### December 2025
- **Conversational Value Discovery** (ChatValueDiscovery.jsx)
  - Chat-style interface for discovery questions
  - AI-powered follow-ups using Gemini 3 Flash
  - Topic tracking with visual progress bar
  - Conversation persistence across sessions
  - Section-specific openers and context hints

- **3rd Party Integrations Dropdown** - Fixed to 2-column layout

- **TopBar Layout & Alignment** - Major overhaul completed

- **IPAM Section Enhancements**:
  - GridMultiSelect components for DNS Platform, Cloud Platform
  - SyncedNumberField for DC/Sites with TopBar mismatch warnings
  - SmartFill input ("+ Add response" button with textarea)
  - 3rd Party Integrations and Orchestration Tools dropdowns

## Known Issues
1. **Static Question File**: Frontend uses `/frontend/src/lib/questions.js` instead of fetching from API. Must sync manually with `/backend/data/questions.py`
2. **External DNS QPS Auto-Calculation**: May not work reliably (needs verification)

## Backlog (Prioritized)

### P0 - Critical
- None currently

### P1 - High Priority  
- [ ] Implement AI logic for "Examine for answers" button
- [ ] Verify External DNS QPS auto-calculation
- [ ] Full Home Assistant UI consistency review

### P2 - Medium Priority
- [ ] Keyboard shortcuts (Tab navigation, Ctrl+S to save)
- [ ] AI Discovery Assistant enhancements
- [ ] Decouple frontend from static questions.js

### P3 - Low Priority
- [ ] AssessmentQuestions.jsx decomposition (1300+ lines)

## API Endpoints

### AI Endpoints
- `POST /api/value-discovery-chat` - Conversational discovery with AI follow-ups
- `POST /api/analyze-notes` - SmartFill note analysis
- `POST /api/generate-context` - Generate context summaries
- `POST /api/generate-value-props` - Generate value propositions
- `GET /api/questions` - Get discovery questions
- `GET /api/value-framework` - Get value framework data

### Customer Endpoints
- `GET/POST /api/customers` - List/Create customers
- `GET/PUT/DELETE /api/customers/{id}` - CRUD operations
- `GET/PUT /api/customers/{id}/discovery` - Discovery data

## 3rd Party Integrations
- **Gemini 3 Flash**: Via Emergent LLM Key for SmartFill and Value Discovery Chat
- **xlsx**: Excel file generation for exports
