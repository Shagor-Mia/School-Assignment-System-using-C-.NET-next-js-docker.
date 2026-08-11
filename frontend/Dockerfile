# Build context is expected to be the `frontend/` directory, e.g.:
#   docker build -t assignment-system-frontend .
# Not used by Vercel (which builds this app natively) — see README.md "Docker" section for when
# this is useful.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm install` rather than `npm ci`: package-lock.json is generated on whatever OS a dev last ran
# `npm install` on, and optional native deps (Tailwind's oxide/lightningcss, etc.) resolve different
# platform-specific packages on Linux/musl (this image) than on Windows/macOS — npm ci's strict
# lockfile match then fails with "Missing: @emnapi/... from lock file" even though nothing is
# actually wrong. `npm install` re-resolves for the current platform instead of demanding an exact
# cross-platform match.
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# BACKEND_URL is read server-side at request time (lib/config.ts), not needed at build time.
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# next.config.ts sets output: "standalone", which produces a self-contained server bundle
# (no node_modules needed in the final image).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
