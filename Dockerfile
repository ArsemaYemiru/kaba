# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/prisma.config.ts ./apps/web/
COPY apps/web/prisma ./apps/web/prisma
# Prisma's install hook needs a URL to generate types; it does not connect.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile

FROM dependencies AS source
COPY . .

# Kept separate from the web image: used for migrations and manual initial seed.
FROM source AS tooling
WORKDIR /app/apps/web
ENV NODE_ENV=production HOME=/tmp
RUN mkdir -p storage && chown 1001:1001 storage
USER 1001:1001
CMD ["pnpm", "db:deploy"]

FROM source AS builder
ARG NEXT_PUBLIC_SITE_URL=http://13.140.175.12:3006
ARG R2_PUBLIC_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL R2_PUBLIC_URL=$R2_PUBLIC_URL
# Build-only placeholders. Real credentials come from the server's .env.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-only-placeholder-at-least-32-characters \
    BETTER_AUTH_URL=$NEXT_PUBLIC_SITE_URL sh -c 'mkdir -p apps/web/public && pnpm build'

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --no-create-home app
COPY --from=builder --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=app:app /app/apps/web/public ./apps/web/public
WORKDIR /app/apps/web
RUN mkdir -p storage .next/cache && chown -R app:app storage .next/cache
USER app
EXPOSE 3000
CMD ["node", "server.js"]
