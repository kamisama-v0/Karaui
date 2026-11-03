# Production image for the docs site. Built by .github/workflows/deploy.yml and
# pulled by the VPS (/opt/apps/karaui); the VPS never builds.
# Dependencies install with Bun (bun.lock), Next.js builds and runs on Node.

FROM oven/bun:1.4.4 AS bun

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Inlined into the client bundle, so they must be present at build time.
ARG NEXT_PUBLIC_SITE_URL=https://karaui.kamisama-v0.my.id
ARG NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=$NEXT_PUBLIC_GOOGLE_ANALYTICS_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/next/dist/bin/next build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Owned by node so the image-optimizer cache volume mounted here is writable.
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
