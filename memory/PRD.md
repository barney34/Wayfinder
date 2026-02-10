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

### Phase 9 — Services Multi-Select (Complete - Feb 6, 2026)
- **Services Column**: New column in Site Sizing table between Role and Platform
- **Co-located Services Popover**: Multi-select with 5 services (NTP, DFP, TFTP, FTP, HTTP)
- **Performance Overhead**: Each service has impact percentage (NTP 0%, DFP +5%, TFTP +2%, FTP +2%, HTTP +3%)
- **Token Calculation**: Tokens increase based on total service overhead
- **Export Integration**: CSV and YAML exports include services data

### Phase 10 — Platform Alert Dialog (Complete - Feb 6, 2026)
- **Confirmation Alert**: Shows when switching from recommended to non-recommended platform
- **Warning Content**: Explains why recommended platform is better with bullet points
- **Dynamic Content**: Shows DC/Site count, recommended platform explanation based on selection

### Phase 11 — PDF/Excel Export & Model Math Fix (Complete - Feb 6, 2026)
- **Export Dropdown Menu**: Unified export button with 4 options (CSV, Excel, PDF, YAML)
- **Excel Export (xlsx)**: Multi-sheet export with Site Sizing, Bill of Materials, Summary sheets
- **PDF Export (jspdf)**: Formatted report with summary boxes, site sizing table, BOM table, token summary
- **Model Math Fix**: GM/GMC roles now use object capacity (not QPS/LPS)
- **Dependencies Added**: jspdf, jspdf-autotable, xlsx

### Phase 12 — Quick Capture UI Overhaul (Complete - Feb 7, 2026)
- **Rapid Entry Mode**: DC/Site toggle buttons with Name and KW fields for fast data entry
- **Press Enter to Add**: Instant add with fields auto-clearing for next entry
- **Two-Column Layout**: Data Centers on left, Locations on right with auto-wrapping grid
- **Dynamic Island Tags**: Compact pill-shaped tags with in-place editing (click to edit)
- **Consolidated IP Calculation**: Inline formula (KW × mult = IPs) with Auto/Manual toggle
- **Platform Mode Inline**: NIOS/UDDI/Hybrid toggle centered above grid
- **Consolidated Summary Bar**: Single row showing Sites, IPs, Tokens, Partner SKU
- **KW Auto-population**: KW field auto-fills from IP Calc when DC mode active
- **Manual Override**: When IP calc is "Manual", the override value applies to all DCs
- **Column Header Rename**: "Site Name" renamed to "Location" in Sizing table

### Phase 13 — Platform Sync & IP Propagation (Complete - Feb 10, 2026)
- **Platform Mode Shared State**: platformMode moved to DiscoveryContext for sync between Quick Capture and Sizing
- **IP Calculator → DC IPs**: All DC locations now use the IP Calculator value (KW × multiplier or manual override)
- **GM Services Impact**: Services add ~100 IPs capacity requirement per service to GM sizing
- **Compact Tags**: Tags reduced to text-[9px], px-1 py-px padding, flex-wrap layout (40% smaller)
- **Platform Toggle Sync**: NIOS/UDDI/Hybrid toggle in Quick Capture syncs with Site Sizing Recommendations
- **Role/Platform by Mode**: UDDI mode removes GM/GMC roles and shows NXVS/NXaaS platforms

### Phase 14 — Layout & Navigation Improvements (Complete - Feb 10, 2026)
- **Sticky Header**: Header section (Customer info, Quick Capture, tabs) stays fixed with flex-shrink-0
- **Scroll Container**: Tab content area uses flex-1 overflow-y-auto for vertical scrolling
- **Optimized Sidebar**: Narrower sidebar (w-48 default, w-14 collapsed) with collapse/expand toggle
- **Collapsible Sidebar**: Icons-only mode when collapsed, smooth transition animation
- **Bubble-Match Alignment**: Content constrained with max-w-5xl mx-auto, inputs contained within visual boundaries
- **Compact Quick Capture**: IP Calc section reduced to 100px width, entry name field capped at 120px

### Phase 15 — Responsive UI & Condensed Numbers (Complete - Feb 10, 2026)
- **Condensed Number Display**: formatNumber() converts 62500→62.5K, 1600000→1.6M, 500000→500K
- **Responsive Scaling**: 153 lg: breakpoint classes (CustomerDetail: 74, TokenCalculatorSummary: 79)
- **Full-Width Layout**: Removed max-w-5xl constraint, content fills sidebar to right edge
- **Auto-Fit Table Columns**: table-auto class with right-sized column widths
- **Raw Numbers in Edit**: Input fields show raw values (62500), display shows abbreviated (62.5K)
- **Larger UI on Big Screens**: Text scales from text-xs → text-base, inputs from h-8 → h-10 on lg: breakpoint
- **Summary Bar Condensed**: Shows 1.6M IPs, 34.3K Tokens, 690K KW instead of raw numbers

### Phase 16 — Tab Redesign & UI Polish (Complete - Feb 10, 2026)
- **Tab Navigation Redesign**: Icons + labels, bottom-border active state, increased padding
- **Renamed Versions to History**: More intuitive naming for revision control
- **Combined Import/Export Tab**: Single tab for data import and export functionality
- **Export Button on All Pages**: Discovery, Sizing, and Tokens tabs all have Export buttons
- **Three-Column Quick Capture**: IP Calculator | Entry Bar + Tags | Summary Stats layout

### Phase 17 — SmartFill & Discovery UI Redesign (Complete - Feb 10, 2026)
- **SmartFill Compact Paste Box**: Auto-expanding textarea (60px → 120px) for meeting notes
- **Context Summaries 3-Column Layout**: Customer Environment, Project Outcomes, Target End State
- **Auto-Generate Summaries**: Summaries auto-generate on page load when meeting notes exist
- **Analyze All Button**: Manual trigger for generating all context summaries
- **Individual Refresh Buttons**: Each summary field has a refresh icon for targeted regeneration
- **Editable Summaries**: All context fields are editable textareas
- **Bullet-Point Format**: AI generates short, descriptive bullet points (not paragraphs)
- **Backend Enhancement**: /api/generate-context now accepts meetingNotes and produces bullet-point output

### Phase 18 — Discovery 3-Column Layout v2 (Complete - Feb 10, 2026)
- **3-Column Grid**: ALL questions distributed across 3 columns on desktop (lg:grid-cols-3)
- **Checkboxes for Yes/No**: Simple checkbox (☑) for fast one-click Yes/No selection
- **Checkboxes for Sections**: Section headers use checkbox for On/Off toggle
- **Full Question Text**: Long questions wrap within columns, no truncation
- **Clickable Rows for Text Questions**: Entire row clickable to expand note field
- **Single Note Field**: Just one textarea for consistency (no separate answer/note fields)
- **Multi-Select with Checkboxes**: Dropdown stays open, uses checkboxes, has "Done" button
- **Column Shading**: Middle column has subtle gray background
- **Visible Separators**: Clear border-bottom between each question row
- **Conditional Questions**: Light blue styling with "↳ If Yes:" label

### Phase 19 — Hub & Spoke DHCP Sizing (Complete - Feb 10, 2026)
- **DHCP Partner Dropdown**: Sites with DHCP/DNS+DHCP roles can select a Hub site for DHCP failover
- **Role-Based Visibility**: GM, GMC, and DNS-only roles show "N/A" (no DHCP partner applicable)
- **Hub Identification**: A site becomes a Hub when other sites point to it as their DHCP Partner
- **Spoke Penalty**: Spoke sites have 50% LPS penalty (2x capacity needed for DHCP forwarding)
- **Hub Sizing**: Hub sites sized for base LPS + aggregated LPS from all Spokes
- **Server Count**: New "Srv#" column allows specifying multiple servers per site (tokens × count)
- **Visual Indicators**: Hub sites show blue dot/background, Spoke sites show amber dot/background
- **Tooltip Details**: Hover on icon shows Hub/Spoke status with connected site information
- **Role Change Auto-Clear**: Changing role from DHCP to non-DHCP auto-clears dhcpPartner
- **Live Token Updates**: Totals recalculate when Hub/Spoke relationships or server counts change

### Phase 20 — Grid Master Sizing & Guardrails (Complete - Feb 10, 2026)
- **GM Object Counting**: Automatic calculation of Grid Master object requirements:
  - DHCP Lease Objects = clients × 2
  - DNS Objects = DHCP clients × 3 + Static clients × 2
  - Discovery Objects = 1 per active IP (when enabled)
  - Total Grid Objects with 10% buffer
- **GM Service Restrictions**: Warning system for models that should NOT run DNS/DHCP services:
  - TE-926: ✓ OK if no Reporting Server
  - TE-1516: ⚠️ Not recommended if >8 members
  - TE-1526, TE-2326, TE-4126: ❌ NOT RECOMMENDED
- **Minimum GM Model**: Automatic recommendation based on 60% capacity target at rollout
- **Utilization Display**: Current utilization percentage with color indicator (green ≤60%, red >60%)
- **Service Restrictions Table**: Color-coded visual reference for GM service restrictions
- **Constants Updated**: niosGridConstants now includes all documented multipliers:
  - maxDbUtilizationPercent: 60%
  - bufferPercent: 10%
  - multiRolePenaltyPercent: 50% (NIOS)
  - uddiMultiRoleMultiplier: 1.3 (130% for UDDI)
  - dhcpFailoverPenaltyPercent: 50%

## Pending / Backlog

### P1
- **UDDI Sizing Penalties**: Add specific performance penalties for UDDI platform (Hub & Spoke, multi-protocol) - awaiting user-provided numbers

### P2
- **Display Sizing Math**: Show content from sizing-math.md as help/info panel within Sizing tab
- AI Discovery Assistant (industry-specific follow-up questions)
- Backend route refactoring (split server.py into routes/models)
- Refactor large components (CustomerDetail.jsx, TokenCalculatorSummary.jsx) into smaller sub-components

## Test Reports
- iteration_5.json: Post-migration (91 questions, 12 sections)
- iteration_6.json: Full UI rewrite (Quick Capture, 6 tabs, Platform badges, auto-save)
- iteration_7.json: SiteConfiguration bug fix verification (100% pass rate)
- iteration_8.json: TokenCalculatorSummary feature verification (100% pass rate)
- iteration_9.json: UDSMembersTable feature verification (100% pass rate)
- iteration_10.json: Missing features fix verification (100% pass rate)
- iteration_11.json: Platform Mode Toggle verification (100% pass rate)
- iteration_12.json: Services Multi-Select verification (100% pass rate)
- iteration_13.json: Platform Alert Dialog verification (100% pass rate)
- iteration_14.json: PDF/Excel Export & Model Math verification (100% pass rate)
- iteration_15.json: Platform Sync & IP Propagation verification (100% pass rate)
- iteration_16.json: Layout & Navigation Improvements verification (100% pass rate)
- iteration_17.json: Responsive UI & Condensed Numbers verification (100% pass rate)
- iteration_18.json: Tab Redesign & UI Polish verification (100% pass rate)
- iteration_19.json: SmartFill UI Redesign verification (100% pass rate)
- iteration_20.json: Discovery 3-Column Layout v2 verification (100% pass rate)
- iteration_21.json: Discovery Checkboxes & Clickable Rows verification (100% pass rate)
- iteration_22.json: Hub & Spoke DHCP Sizing verification (100% pass rate)

## Last Updated
February 10, 2026 - Hub & Spoke DHCP failover topology feature complete
