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

### December 2025 (Latest Session)

#### Multiple Drawings System (COMPLETED)
A major new feature enabling management of multiple sizing scenarios within a single session:
- **Drawing Tabs**: Tabbed interface at top of Sizing table (#10, #20, etc.) with add/copy/delete/rename
- **Drawing # Increments of 10**: New drawings auto-increment by 10 (10, 20, 30...)
- **Drawing Header**: Shows "Drawing #10 (X sites)" above table
- **New Drawing**: Creates blank drawing with incrementing number
- **Duplicate Drawing**: Copies existing drawing with "-copy" suffix
- **Compare Drawings**: Side-by-side comparison when 2+ drawings exist
- **Copy Site to Drawing**: Copy individual sites between drawings via action menu
- **Delete Any Row**: All rows can be deleted via trash icon (not just manual sites)

#### Enhanced HA & Server Count Logic (COMPLETED)
- **HA Checkbox**: Per-row toggle that doubles software instances (SW#)
- **SW# Column**: Auto-calculated: `Srv# × (HA ? 2 : 1)`
- **HW# Column**: Editable hardware count with "Include HW" checkbox
- **Include HW Checkbox**: Uncheck to set HW#=0 for VM deployments
- **Platform Simplified**: Only 2 options: `NIOS Physical` / `NIOS Virtual` (HA versions removed)
- **Column Toggles**: Hide/show KW, Services, and HW SKU columns

#### Export for Lucid (COMPLETED)
Updated export with columns: `Drawing #`, `Unit Group`, `Unit #/Range`, `Solution`, `Model Info`, `SW Instances`, `Description`, `SW Base SKU`, `SW Package`, `SW Add-ons`, `HW License SKU`, `HW Add-ons`, `HW Count`, `Add to Report`, `Add to BOM`
- **Unit Range Format**: 1-4 units shows as "1,2,3,4", 5+ units shows as "1-5"
- **VM Detection**: Shows "VM" for virtual platforms in HW License SKU

- **Light Mode Fix** - Fixed black/dark windows appearing in light mode. Replaced hard-coded dark hex colors (#1c1c1e, #2c2c2e, #3c3c3e) with theme-aware CSS variables (bg-card, bg-muted, bg-background, text-foreground, etc.) in:
  - TopBar.jsx - All cards, inputs, and buttons
  - ChatValueDiscovery.jsx - Chat container, messages, and inputs
  - AssessmentQuestions.jsx - Section tabs and form elements

- **P0 Bug Fix: DC Count Sync** - Adding Data Center from Sizing page now correctly updates the "# of Data Centers" field (ud-5) in Discovery IPAM section. Fixed by making `saveToServer()` call synchronous in `addManualDataCenter()`.
  
- **P1 Bug Fix: Site/DC Persistence** - Manually added Sites and Data Centers now persist across navigation. Fixed by removing local state and using context functions (`addSite`, `addDataCenter`) for all entries.

- **Conversational Value Discovery v2** (ChatValueDiscovery.jsx)
  - Mode toggle: Guided (3Q per topic) vs Free Ask
  - Clickable topic pills to pivot conversation
  - Question counters showing X/3 progress per topic
  - Visual indicators: orange (incomplete), purple ring (active), green ✓ (complete)
  - AI-powered follow-ups using Gemini 3 Flash
  - Conversation persistence across sessions

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
- ✅ COMPLETED: Multiple Drawings System (tabbed interface, add/copy/delete drawings)
- ✅ COMPLETED: HA checkbox with SW#/HW# logic
- ✅ COMPLETED: Export for Lucid with correct column format
- ✅ COMPLETED: DC count sync between Sizing and Discovery tabs
- ✅ COMPLETED: Manual Site/DC persistence across navigation
- ✅ COMPLETED: Delete any row (not just manual sites)
- ✅ COMPLETED: Include HW checkbox per row

### P1 - High Priority  
- ✅ COMPLETED: Export View toggle (simplified table showing export-relevant columns)
- ✅ COMPLETED: Unit Range Format selector (Auto/Comma/Range/Individual)
- ✅ VERIFIED: External DNS QPS auto-calculation (working - shows "Auto" badge)
- [ ] Implement AI logic for "Examine for answers" button
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
