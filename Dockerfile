FROM node:22-slim AS builder
WORKDIR /app

# ── Install root deps ────────────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci

# ── Install client deps and build React app ──────────────────────────────────
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client ./client
RUN cd client && npm run build

# ── Production image ─────────────────────────────────────────────────────────
FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server ./server

# Copy built frontend from builder stage
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/index.js"]
