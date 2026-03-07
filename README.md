# Wayfinder — Infoblox Sizing Planner

Customer discovery and technical assessment tool for Infoblox sizing and value selling.

## Stack

- **Backend**: Python 3.11, FastAPI, Motor (async MongoDB), Google Gemini AI
- **Frontend**: React 19, Vite 6, TailwindCSS, shadcn/ui
- **Database**: MongoDB (Atlas or local)

---

## Quick Start — Docker Compose

### Prerequisites
- Docker Desktop
- A MongoDB Atlas connection string (or local `mongod`)
- A Google AI Studio API key ([aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))

### 1. Configure environment

```sh
cp backend/.env.example backend/.env
# Edit backend/.env with your real values
```

`backend/.env` must contain:
```
MONGO_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>
DB_NAME=discovery_track_ai
GOOGLE_API_KEY=<your_google_ai_studio_key>
GEMINI_MODEL=gemini-2.5-flash
```

### 2. Build and run

```sh
docker compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000  |
| Backend  | http://localhost:8001  |
| API docs | http://localhost:8001/docs |

---

## Manual Local Setup

### Backend

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in real values
python3 -m uvicorn server:app --reload --port 8001
```

### Frontend

```sh
cd frontend
npm install --legacy-peer-deps
cp .env.example .env   # or create frontend/.env manually
npm run dev            # starts on http://localhost:3000
```

`frontend/.env` must contain:
```
VITE_BACKEND_URL=http://localhost:8001
```

---

## Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| `MONGO_URL` | `backend/.env` | MongoDB connection string |
| `DB_NAME` | `backend/.env` | Database name (default: `discovery_track_ai`) |
| `GOOGLE_API_KEY` | `backend/.env` | Google AI Studio key for Gemini |
| `GEMINI_MODEL` | `backend/.env` | Model name (default: `gemini-2.5-flash`) |
| `BACKEND_URL` | `backend/.env` | Used by `backend_test.py` (default: `http://localhost:8001`) |
| `VITE_BACKEND_URL` | `frontend/.env` | Backend URL for the React app |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET/POST` | `/api/customers` | List / create customers |
| `GET/PATCH/DELETE` | `/api/customers/{id}` | Customer CRUD |
| `GET/PUT` | `/api/customers/{id}/discovery` | Discovery data |
| `GET` | `/api/questions` | All discovery questions |
| `GET` | `/api/value-framework` | Value framework data |
| `POST` | `/api/analyze-notes` | SmartFill — extract answers from notes |
| `POST` | `/api/generate-context` | Generate context summaries |
| `POST` | `/api/generate-value-props` | Generate value propositions |
| `POST` | `/api/value-discovery-chat` | Conversational value discovery |

Interactive docs available at `http://localhost:8001/docs` when the backend is running.
