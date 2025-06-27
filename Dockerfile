# Use the official Node.js 20 image as base
FROM node:20-alpine AS base

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

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder
COPY public ./public

# Copy build output from builder (will work both with and without pre-built artifacts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
