# Build stage
FROM node:24.6.0-alpine3.22 AS builder

WORKDIR /app

# Copy workspace and package files
COPY ../../package.json ../../pnpm-lock.yaml ../../pnpm-workspace.yaml ./
COPY package.json ./packages/backend/

# Install tini and pnpm, then dependencies
RUN apk add --no-cache tini && \
    npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . ./packages/backend/

# Build the application
RUN pnpm --filter backend build

# Production stage with init
FROM node:24.6.0-alpine3.22 AS production

# Install tini in production stage
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./dist

# Copy production dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy package.json for any runtime needs
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/package.json ./package.json

# Switch to non-root user
USER nodejs

# Environment variables (documented from .env.example)
# OAuth Configuration
ENV FOURSQUARE_CLIENT_ID=""
ENV FOURSQUARE_CLIENT_SECRET=""
ENV FOURSQUARE_REDIRECT_URI="http://localhost:3000/auth/swarm/callback"

# Push API Configuration  
ENV FOURSQUARE_PUSH_SECRET=""
ENV DISCORD_WEBHOOK_URL=""

# Debug User Configuration
ENV DEBUG_FOURSQUARE_USER_ID=""
ENV DEBUG_ACCESS_TOKEN=""

# Server Configuration
ENV PORT=8080
ENV NODE_ENV=development

# Expose port (using PORT env var)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get(`http://localhost:${process.env.PORT}/webhook/health`, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]