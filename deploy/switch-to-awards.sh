#!/usr/bin/env bash
# One-time switch of /opt/kaba-prod from Feta Show to Feta Awards (A-78).
# Run it on the server BEFORE the first Feta Awards deployment:
#   bash /opt/kaba-prod/switch-to-awards.sh
# It is safe to run twice. It:
#   1. backs up the Feta Show database and uploaded media into backups/,
#   2. stops the Feta Show containers (its volumes are kept, never deleted),
#   3. adds the Feta Awards keys to .env without overwriting existing values.
set -Eeuo pipefail
cd "${DEPLOY_DIR:-/opt/kaba-prod}"
test -f .env || { echo 'ERROR: /opt/kaba-prod/.env is missing. Run bootstrap.sh first.'; exit 1; }
umask 077
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)

# Feta Show containers and volumes, by their Compose labels (project kaba-prod).
show_db=$(docker ps -aq --filter label=com.docker.compose.project=kaba-prod --filter label=com.docker.compose.service=postgres | head -1)
show_pgdata=$(docker volume ls -q --filter label=com.docker.compose.project=kaba-prod | grep -E '(^|_)pgdata$' | grep -v awards || true)
show_media=$(docker volume ls -q --filter label=com.docker.compose.project=kaba-prod | grep -E '(^|_)media$' | grep -v awards || true)

if [ -n "$show_db" ] && docker exec "$show_db" psql -U kaba -d kaba -Atc 'select 1' >/dev/null 2>&1; then
  echo "Backing up the Feta Show database…"
  docker exec "$show_db" pg_dump -U kaba -d kaba | gzip > "backups/feta-show-final-$stamp.sql.gz"
  echo "  → backups/feta-show-final-$stamp.sql.gz ($(du -h "backups/feta-show-final-$stamp.sql.gz" | cut -f1))"
else
  echo "No running Feta Show database found (already switched?). Skipping the database backup."
fi

if [ -n "$show_media" ]; then
  echo "Backing up Feta Show media from volume $show_media…"
  docker run --rm -v "$show_media":/media:ro -v "$PWD/backups":/backup alpine:3.20 \
    tar -czf "/backup/feta-show-media-$stamp.tar.gz" -C /media .
  echo "  → backups/feta-show-media-$stamp.tar.gz"
fi

# Stop Feta Show (no -v: its volumes stay on disk as a second copy).
if [ -f docker-compose.production.yml ] && [ -n "$(docker ps -q --filter label=com.docker.compose.project=kaba-prod)" ]; then
  echo "Stopping the Feta Show containers…"
  docker ps -q --filter label=com.docker.compose.project=kaba-prod | xargs -r docker stop >/dev/null
  docker ps -aq --filter label=com.docker.compose.project=kaba-prod | xargs -r docker rm >/dev/null
fi

# .env: add what Feta Awards needs; existing values are never changed.
add() { grep -q "^$1=" .env || { printf '%s=%s\n' "$1" "$2" >> .env; echo "  + $1"; }; }
echo "Checking .env…"
add POSTGRES_PASSWORD "$(openssl rand -hex 32)"
add BETTER_AUTH_SECRET "$(openssl rand -hex 32)"
add PRODUCTION_URL "http://13.140.175.12:3006"
add WEB_BIND_IP "0.0.0.0"
add WEB_PORT "3006"
add STORAGE_DRIVER "local"
add SEED_ADMIN_EMAIL "admin@fetaawards.com"
add SEED_ADMIN_PASSWORD "$(openssl rand -hex 24)"
add SEED_EDITOR_EMAIL "editor@fetaawards.com"
add SEED_EDITOR_PASSWORD "$(openssl rand -hex 24)"
# Optional: staff password-reset emails. Fill these in to enable them.
add SMTP_HOST ""
add SMTP_PORT "587"
add SMTP_USER ""
add SMTP_PASS ""
add MAIL_FROM ""
chmod 600 .env

echo
echo "Done. Feta Show is stopped; its backups are in $(pwd)/backups and its volumes are kept:"
printf '  %s\n' $show_pgdata $show_media
echo "Next: merge the Feta Awards PR to main (the deploy starts automatically),"
echo "then create the staff accounts once:"
echo "  cd /opt/kaba-prod && export \$(cat .image.env) && docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml run --rm migrator pnpm db:seed"
