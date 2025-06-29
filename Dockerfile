# Use the official Node.js 20 image as base
FROM node:22-alpine AS base

# Install pnpm and enable corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage with all dependencies
FROM base AS builder
WORKDIR /app

# Install all dependencies (including dev) for build process
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Provide a dummy DATABASE_URL for build process
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

RUN pnpm build

# Compile migration script
RUN npx tsc --project tsconfig.migrate.json

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY public ./public

# Copy package.json for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy build output from builder (will work both with and without pre-built artifacts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration files and script
COPY --from=builder --chown=nextjs:nodejs /app/dist/migrate.js ./
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations and start server
CMD ["sh", "-c", "echo 'DATABASE_URL check:' && echo $DATABASE_URL | sed 's/:[^@]*@/:***@/' && node ./migrate.js && node server.js"]

