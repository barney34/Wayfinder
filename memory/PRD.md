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

### Phase 4 — Site Configuration Integration (Complete - Feb 6, 2026)
- **SiteConfiguration component** fully integrated with Quick Capture bar
- Auto-sync: Data Centers and Sites from Quick Capture automatically populate Sizing table
- IP calculation: Knowledge Workers × multiplier (default 2.5)
- Role assignment: First DC → Grid Master, subsequent DCs → Grid Master Candidate, Sites → DNS+DHCP
- Hardware SKU recommendations based on site sizing
- Manual site additions supported alongside auto-synced sites
- **AI model upgraded**: Gemini 3 Flash via Emergent LLM Key for SmartFill features

### Phase 5 — Token Calculator Summary (Complete - Feb 6, 2026)
- **TokenCalculatorSummary component** provides comprehensive sizing overview
- Summary cards: Total Sites, Total IPs, Total Tokens, Partner SKU recommendation
- Site Sizing Recommendations table with role badges (GM/GMC/DNS/DHCP)
- Bill of Materials (BOM) grid aggregating hardware SKUs with quantities
- Token Breakdown: Infrastructure, Security, UDDI tokens with total
- Partner SKU tiers: 5K, 10K, 17K, 25K, 50K, 100K+ based on total tokens
- Real-time updates when Quick Capture data changes

### Phase 6 — UDS Members Table (Complete - Feb 6, 2026)
- **UDSMembersTable component** for managing grid members within sites
- Member table with: Name, Location, Platform, Model/Size, Role, HA, Tokens
- Platform support: NIOS Physical/Virtual/HA, NXVS, NXaaS
- Role assignment: Grid Master, GMC, DNS, DHCP, DNS+DHCP, Reporting
- Token calculation: NIOS by model (TE-926=880), UDDI by size (S=470)
- Expandable rows for DNS/DHCP feature toggles with performance impact %
- Add/Duplicate/Delete member functionality
- Locations dropdown reads from Quick Capture (DCs + Sites)

### Phase 7 — Missing Features Fix (Complete - Feb 6, 2026)
- **Editable Site Sizing**: ALL fields now editable (name, IPs, role, platform, hardware SKU)
- **CSV/YAML Export**: Download buttons for site-sizing-export.csv and .yaml
- **Dossier Free Upsize**: Green card shows when within 2 units of next tier with token savings math
- **Dossier Tier Display**: Shows current tier badge (Starter→Unlimited) with QPD/tokens math
- **Floating Save Button**: Fixed bottom-right, appears when isDirty with "Unsaved changes" indicator
- **Add Site Button**: Creates manual sites with defaults in Token Calculator Summary

### Phase 8 — Platform Mode Toggle (Complete - Feb 6, 2026)
- **NIOS/UDDI/Hybrid Platform Toggles**: ToggleGroup to switch between deployment modes
- **Platform-Specific Role Options**: UDDI mode removes GM/GMC roles (only DNS, DHCP, DNS/DHCP available)
- **Platform-Specific Dropdown Options**: NIOS shows Physical/Virtual/HA, UDDI shows NXVS/NXaaS, Hybrid shows all
- **Recommended Platform Badge**: Star icon on recommended platform, "Not Recommended" warning when different platform selected
- **Smart Platform Recommendation**: Based on DC/Site count (>50 sites = UDDI, 2+ DCs & >10 sites = Hybrid, else NIOS)
- **IP Calculation Logic**: GM/GMC roles use KW directly (grid objects), DNS/DHCP roles use KW × multiplier
- **Summary Badges Update**: Shows GM/GMC/Members breakdown for NIOS/Hybrid, Members only for UDDI
- **Bug Fix**: Fixed UDDI detection in getSiteRecommendedModel() (was checking 'NX' instead of 'NXVS')
- **Bug Fix**: Fixed duplicate closing bracket syntax error in CustomerDetail.jsx

### Phase 9 — Services Multi-Select (Complete - Feb 6, 2026)
- **Services Column**: New column in Site Sizing table between Role and Platform
- **Co-located Services Popover**: Multi-select with 5 services (NTP, DFP, TFTP, FTP, HTTP)
- **Performance Overhead**: Each service has impact percentage (NTP 0%, DFP +5%, TFTP +2%, FTP +2%, HTTP +3%)
- **Token Calculation**: Tokens increase based on total service overhead (e.g., DFP adds 5% → 880→924)
- **Visual Feedback**: Selected services shown in button, total overhead displayed in popover
- **Export Integration**: CSV and YAML exports include services data

## Pending / Backlog

### P1
- Alert for deviating from recommended platform (visual feedback modal)

### P2
- Verify Model Math for Multi-protocol (combined DNS/DHCP penalty calculation)
- Export to PDF/Excel
- AI Discovery Assistant (industry-specific follow-up questions)
- Backend route refactoring (split server.py into routes/models)
- Fix nested button warning in AccordionTrigger with Switch component
- Fix unique key warning in UDSMembersTable TableBody

## Test Reports
- iteration_5.json: Post-migration (91 questions, 12 sections)
- iteration_6.json: Full UI rewrite (Quick Capture, 6 tabs, Platform badges, auto-save)
- iteration_7.json: SiteConfiguration bug fix verification (100% pass rate)
- iteration_8.json: TokenCalculatorSummary feature verification (100% pass rate)
- iteration_9.json: UDSMembersTable feature verification (100% pass rate)
- iteration_10.json: Missing features fix verification (100% pass rate)
- iteration_11.json: Platform Mode Toggle verification (100% pass rate)
