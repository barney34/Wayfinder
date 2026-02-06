# DiscoveryTrackAI - Product Requirements Document

## Original Problem Statement
Migrate DiscoveryTrackAI from Replit (Express.js/TypeScript/PostgreSQL/Drizzle) to Emergent Platform (React/FastAPI/MongoDB) with Gemini AI integration.

## Project Overview
**Infoblox Customer Discovery & Technical Assessment System** - A tool for Sales Engineers to manage customer profiles, track discovery phases (PSAR, ARB, Design), and leverage AI for meeting notes analysis.

## Tech Stack
- **Frontend**: React.js + Tailwind CSS + shadcn/ui components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Google Gemini 2.5 Flash via Emergent LLM Key

## User Personas
1. **Sales Engineers (SE)** - Primary users managing customer discovery
2. **Technical Architects** - Review and validate customer requirements
3. **Project Managers** - Track progress across customer engagements

## Core Requirements (Static)
- Customer management (CRUD operations)
- PSAR/ARB/Design phase tracking with status badges
- Discovery questionnaire system
- AI-powered meeting notes analysis
- Export/Import customer data
- Multi-SE support with grouped views

## What's Been Implemented

### Session 1 - Feb 6, 2026
- [x] Backend migration to FastAPI + MongoDB
- [x] Customer CRUD API endpoints (/api/customers)
- [x] Discovery questions API (/api/questions)
- [x] AI endpoints (/api/analyze-notes, /api/generate-context)
- [x] Frontend migration with React + Tailwind
- [x] Dashboard with customer table and completion progress
- [x] Customers page with SE grouping
- [x] Status badges (PSAR/ARB/Design) with click-to-advance
- [x] Customer detail view
- [x] Search functionality
- [x] Clone customer functionality
- [x] Delete customer with confirmation
- [x] Export customer data as JSON
- [x] Theme toggle (light/dark - partially working)

## Prioritized Backlog

### P0 - Critical
- [ ] Full discovery questionnaire form with all sections (IPAM, DNS, DHCP, Security, etc.)
- [ ] AI meeting notes analysis UI integration
- [ ] Context summary generation UI

### P1 - High Priority
- [ ] Site configuration tool
- [ ] Token calculator for security configurations
- [ ] Grid sizing tool
- [ ] Dark mode CSS fix (CSS variables not applying)

### P2 - Medium Priority
- [ ] Customer data persistence to backend (currently localStorage for answers)
- [ ] Import customer data from JSON
- [ ] Multi-file export (with attachments)
- [ ] Print-friendly reports

### P3 - Nice to Have
- [ ] Real-time collaboration
- [ ] Email notifications
- [ ] Integration with CRM systems
- [ ] Dashboard analytics charts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/customers | List all customers |
| GET | /api/customers/:id | Get customer by ID |
| POST | /api/customers | Create customer |
| PATCH | /api/customers/:id | Update customer |
| DELETE | /api/customers/:id | Delete customer |
| GET | /api/questions | Get discovery questions |
| POST | /api/analyze-notes | AI analyze meeting notes |
| POST | /api/generate-context | AI generate context summary |

## Next Tasks
1. Build full discovery questionnaire UI with all sections
2. Integrate AI analysis into customer detail page
3. Add context summary generation to discovery flow
4. Fix dark mode CSS variables
5. Implement data persistence for questionnaire answers

## Environment Variables
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name (discovery_track_ai)
- `EMERGENT_LLM_KEY` - Universal key for Gemini AI
- `REACT_APP_BACKEND_URL` - Backend API URL
