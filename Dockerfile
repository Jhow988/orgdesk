FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install all deps for building (including devDeps for tailwind, typescript, etc.)
FROM base AS deps
COPY app/package.json app/package-lock.json ./
RUN NODE_ENV=development npm ci --legacy-peer-deps

# Install only production deps — depends on deps to force sequential execution and avoid OOM
FROM deps AS prod-deps
RUN npm prune --omit=dev --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN NODE_OPTIONS=--max-old-space-size=1536 npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Production node_modules (devDeps removed via prune)
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --chown=nextjs:nodejs app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
