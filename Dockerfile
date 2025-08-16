# Build stage
FROM 24.6.0-alpine3.22 AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS production

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist

# Copy production dependencies from builder
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules

# Copy package.json for any runtime needs
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

# Expose port
EXPOSE 8080

# Health check (using EXEC form for distroless)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:8080/webhook/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"]

# Start the application
CMD ["node", "dist/main.js"]