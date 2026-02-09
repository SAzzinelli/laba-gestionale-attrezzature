FROM node:20-slim

WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Resto backend
COPY backend/ ./backend/

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "backend/server.js"]
