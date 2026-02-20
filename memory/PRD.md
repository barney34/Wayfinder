# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## TopBar Component (Latest — Feb 2026)
- **Customer/Opp pill**: Auto-sizing stacked pill (Customer: on top, Opportunity: below), width grows with content
- **Rich summary bar**: Always visible in header row — shows actual DC/Site mini-pills with names+KW, active Target Solution badges (color-coded), Hybrid badge, KW total + Active IPs
- **DC/Site pills**: `grid-cols-2` layout for legibility, expand naturally into rows (no scroll)
- **Target Solutions**: NIOS, UDDI, Security, Asset toggles + Hybrid auto-detection (feature-* keys)
- **Active IPs**: Same size as Target Solutions column (3fr each, DC/Sites 5fr each)
- **Collapsible**: Click header to collapse — summary bar persists showing all data at a glance
- **IP Calculator**: KW x Multiplier with 0.5-step arrows
- **+ Add buttons**: Always visible, pinned bottom

## Core Features (Implemented)
- Customer management CRUD
- Discovery questions with collapsible sections, scroll-spy nav, section pills
- Cloud Management auto-selects UDDI
- Auto deployment model (NIOS/UDDI/Hybrid)
- Sizing table, Token calculations, Hub/Spoke topology
- SmartFill AI + Value Framework Injection
- History/Versioning, Export (CSV, YAML, Excel, PDF)
- QPS auto-calculation, External DNS vendor multiselect

## Architecture
```
/app
├── backend/ (Flask: server.py, routes/, data/, models/)
└── frontend/src/ (React: TopBar.jsx, AssessmentQuestions.jsx, CustomerDetail.jsx, DiscoveryContext.jsx)
```

## Backlog
- P1: Full Home Assistant UI consistency review
- P2: Keyboard shortcuts (Tab, Ctrl+S)
- P2: AI Discovery Assistant enhancements
- P3: AssessmentQuestions.jsx decomposition (800+ lines)
