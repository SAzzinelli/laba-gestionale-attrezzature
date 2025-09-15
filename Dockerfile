# Use Node.js 20 (LTS)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend dependencies
RUN cd backend && npm install

# Install frontend dependencies
RUN cd frontend && npm install

# Copy all source files
COPY . .

# Build frontend with environment variables
RUN cd frontend && npm run build

# Expose port
EXPOSE 3001

# Start command
CMD ["sh", "-c", "cd backend && node server.js"]
