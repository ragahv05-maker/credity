FROM node:20-slim AS builder

WORKDIR /app

# Copy shared dependencies first (for layer caching)
COPY packages/shared-auth ./packages/shared-auth

# Build shared-auth
WORKDIR /app/packages/shared-auth
RUN npm install && npm run build

# Copy service code
WORKDIR /app
COPY BlockWalletDigi ./service

# Install service dependencies (shared-auth resolves via file: link)
WORKDIR /app/service
RUN npm install --legacy-peer-deps

# Build the service (esbuild bundles shared-auth into output)
RUN npm run build

# --- Production stage ---
FROM node:20-slim AS runner

WORKDIR /app

# Copy only the built output and production node_modules
COPY --from=builder /app/service/dist ./dist
COPY --from=builder /app/service/node_modules ./node_modules
COPY --from=builder /app/service/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 5000

CMD ["npm", "run", "start"]
