# Use the official Node.js 20 image as base (matching your CI)
FROM node:20-alpine AS base

# Install pnpm and enable corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
# Install libc6-compat for alpine compatibility
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage (only used when no pre-built artifacts are available)
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set production environment and disable telemetry
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application (this step can be skipped if using pre-built artifacts)
RUN pnpm build

# Production image with pre-built artifacts support
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY public ./public

# Set the correct permission for prerender cache
RUN mkdir -p .next/static
RUN chown -R nextjs:nodejs .next

# Copy Next.js build output - use pre-built artifacts from CI
# First copy standalone (contains server.js and minimal runtime)
COPY --chown=nextjs:nodejs .next/standalone ./

# Then copy static assets if they exist
COPY --chown=nextjs:nodejs .next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
