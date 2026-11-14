#!/usr/bin/env bash
set -Eeuo pipefail
cd "${DEPLOY_DIR:-/opt/kaba-prod}"
export DOCKER_CONFIG="$PWD/.docker"
test -f .env || { echo 'ERROR: Create /opt/kaba-prod/.env first.'; exit 1; }
: "${IMAGE_PREFIX:?IMAGE_PREFIX is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"
compose=(docker compose --env-file .env -p kaba-prod -f docker-compose.production.yml)
trap 'status=$?; echo "Deployment failed at line $LINENO (exit $status)"; "${compose[@]}" ps || true; "${compose[@]}" logs --tail=80 web || true; exit "$status"' ERR
"${compose[@]}" config --quiet
"${compose[@]}" pull web migrator proxy
"${compose[@]}" up -d --wait --wait-timeout 120 postgres

# Record a database backup before migrations, including on repeat deployments.
mkdir -p backups
chmod 700 backups
backup="backups/$(date -u +%Y%m%dT%H%M%SZ)-${IMAGE_TAG:0:12}.sql.gz"
umask 077
"${compose[@]}" exec -T postgres pg_dump -U kaba -d kaba | gzip > "$backup"
"${compose[@]}" run --rm migrator
"${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 180 web
# Recreate Nginx so its upstream resolves the newly created web container.
"${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 120 proxy
container=$("${compose[@]}" ps -q web)
test -n "$container"
actual_image=$(docker inspect -f '{{.Config.Image}}' "$container")
actual_revision=$(docker inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$container")
test "$actual_image" = "${IMAGE_PREFIX}-web:${IMAGE_TAG}"
test "$actual_revision" = "$IMAGE_TAG"

# Only update the marker after the new image is healthy and verified.
if [ -f .deployed-sha ]; then cp .deployed-sha .previous-sha; fi
printf '%s\n' "$IMAGE_TAG" > .deployed-sha
printf 'IMAGE_PREFIX=%s\nIMAGE_TAG=%s\nDOCKER_CONFIG=%s\n' "$IMAGE_PREFIX" "$IMAGE_TAG" "$DOCKER_CONFIG" > .image.env
"${compose[@]}" ps
echo "Kaba deployed at $IMAGE_TAG"
