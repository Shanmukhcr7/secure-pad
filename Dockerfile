# ─── Stage 1: Build the frontend ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install frontend deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy frontend source and build
COPY . .
RUN npm run build
# Output: /app/dist

# ─── Stage 2: Production backend ─────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/backend

# Install only backend deps
COPY backend/package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy backend source
COPY backend/ .

# Copy the built frontend into the backend's expected dist location
COPY --from=frontend-builder /app/dist /app/dist

# Copy the Aiven CA cert (must exist in project root)
COPY ca.pem /app/ca.pem

# Expose backend port
EXPOSE 3001

# Start the Express server (it serves both the API and the dist frontend)
CMD ["node", "server.js"]
