FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/.npmrc ./
RUN npm install --legacy-peer-deps

COPY frontend ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app/backend

COPY backend/requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY backend ./
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
