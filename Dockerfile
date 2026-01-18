FROM node:20

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy frontend package files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all source files
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Start backend
WORKDIR /app/backend
CMD ["node", "server.js"]
