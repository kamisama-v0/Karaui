# Next.js standalone image for the kamisama blue-green deploy.
# Runtime listens on PORT (always 3000 inside the container); kamisama-deploy.sh
# maps it to LIVE/COPY on the host and gates on GET /health.
#
# The home server's CPU has no AVX (sse4_2 only). Bun >=1.3 crashes running
# heavy JS there (oven-sh/bun#26353), so Bun only installs packages; build and
# runtime use Node.
#
# NEXT_PUBLIC_* values are inlined at build time, so the CI-generated .env must
# exist before `docker build` (it is not in .dockerignore). The image stays
# local to the server and is never pushed to a registry.

# ---- deps (bun install is safe on non-AVX CPUs) ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# 2 CPU / 1.8 GB RAM box: cap the heap so the build leans on swap instead of
# getting OOM-killed.
ENV NODE_OPTIONS=--max-old-space-size=1536
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/next/dist/bin/next build

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Registry routes read component source from disk at request time.
COPY --from=build --chown=node:node /app/components ./components
COPY --from=build --chown=node:node /app/lib ./lib
USER node
EXPOSE 3000
CMD ["node", "server.js"]
