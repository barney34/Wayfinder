# Sizing Planner - PRD

## Original Problem Statement
Infrastructure sizing calculator for planning network deployments. Full migration from TypeScript source with React frontend + FastAPI backend + MongoDB.

## TopBar Component (Latest — Dec 2025)
- **Customer/Opp pill**: Auto-sizing stacked pill (Customer: on top, Opportunity: below), positioned on the left
- **Summary row**: 3 stacked sections equally spaced:
  - DC stacked over Sites (like Customer/Opp)
  - TS with solution badges stacked
  - KW stacked over IPs
- **Input cards row**: 4 cards with weighted grid (1.3fr 1.3fr 0.7fr 0.7fr):
  - Data Centers (larger) - 2-column grid for entries
  - Sites (larger) - 2-column grid for entries  
  - Target Solutions (smaller) - NIOS, UDDI, Security, Asset toggles + Hybrid
  - Active IPs (smaller, equal to TS) - KW input with multiplier
- **Collapsible**: Click header to collapse/expand

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
