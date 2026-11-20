# syntax=docker/dockerfile:1
# Feta Awards (apps/awards). Images are built by GitHub Actions; the build needs
# no database or production credentials (public content is read at request time).
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV COREPACK_HOME=/opt/corepack
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/awards/package.json apps/awards/prisma.config.ts ./apps/awards/
COPY apps/awards/prisma ./apps/awards/prisma
# Prisma's install hook needs a URL to generate types; it does not connect.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile

FROM dependencies AS source
COPY . .

# Kept separate from the web image: runs migrations, and the one-time staff seed.
FROM source AS tooling
WORKDIR /app/apps/awards
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
    BETTER_AUTH_URL=$NEXT_PUBLIC_SITE_URL sh -c 'mkdir -p apps/awards/public && pnpm --filter awards build'

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --no-create-home app
COPY --from=builder --chown=app:app /app/apps/awards/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/awards/.next/static ./apps/awards/.next/static
COPY --from=builder --chown=app:app /app/apps/awards/public ./apps/awards/public
WORKDIR /app/apps/awards
RUN mkdir -p storage .next/cache && chown -R app:app storage .next/cache
USER app
EXPOSE 3000
CMD ["node", "server.js"]
