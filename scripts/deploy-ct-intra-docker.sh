#!/usr/bin/env sh
set -eu

APP_NAME="pubo"
ENV_FILE="${ENV_FILE:-.env.ct-intra}"
HTTP_PORT="${PUBO_HTTP_PORT:-8080}"
DOCKER_CMD="${DOCKER_CMD:-docker}"

docker_cmd() {
  ${DOCKER_CMD} "$@"
}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy .env.ct-intra.example to $ENV_FILE and edit secrets first." >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${POSTGRES_DB:=pubo}"
: "${POSTGRES_USER:=pubo}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
: "${JWT_ACCESS_SECRET:?JWT_ACCESS_SECRET is required}"
: "${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET is required}"
: "${CORS_ORIGIN:=http://ct-intra,https://int.app.pub-o.com,https://int.dash.pub-o.com}"
: "${PUBO_HTTP_PORT:=8080}"

NETWORK="${APP_NAME}_network"
DB_VOLUME="${APP_NAME}_postgres_data"
DB_CONTAINER="${APP_NAME}_postgres"
API_CONTAINER="${APP_NAME}_api"
APP_CONTAINER="${APP_NAME}_app"
DASH_CONTAINER="${APP_NAME}_dash"
LEGACY_WEB_CONTAINER="${APP_NAME}_web"
API_IMAGE="${APP_NAME}_api:latest"
WEB_IMAGE="${APP_NAME}_web:latest"
CLOUDFLARED_CONTAINER="${CLOUDFLARED_CONTAINER:-relaxed_wilbur}"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_CONTAINER}:5432/${POSTGRES_DB}?schema=public"

docker_cmd network inspect "$NETWORK" >/dev/null 2>&1 || docker_cmd network create "$NETWORK" >/dev/null
docker_cmd volume inspect "$DB_VOLUME" >/dev/null 2>&1 || docker_cmd volume create "$DB_VOLUME" >/dev/null

if docker_cmd inspect "$CLOUDFLARED_CONTAINER" >/dev/null 2>&1; then
  docker_cmd network connect "$NETWORK" "$CLOUDFLARED_CONTAINER" >/dev/null 2>&1 || true
fi

for CLOUDFLARED in $(docker_cmd ps --filter ancestor=cloudflare/cloudflared:latest --format '{{.Names}}'); do
  docker_cmd network connect "$NETWORK" "$CLOUDFLARED" >/dev/null 2>&1 || true
done

docker_cmd build -t "$API_IMAGE" -f apps/api/Dockerfile .
docker_cmd build -t "$WEB_IMAGE" -f apps/web/Dockerfile .

docker_cmd rm -f "$DB_CONTAINER" >/dev/null 2>&1 || true
docker_cmd run -d \
  --name "$DB_CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  -e POSTGRES_DB="$POSTGRES_DB" \
  -e POSTGRES_USER="$POSTGRES_USER" \
  -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
  -v "$DB_VOLUME:/var/lib/postgresql/data" \
  postgres:16-alpine >/dev/null

echo "Waiting for PostgreSQL..."
until docker_cmd exec "$DB_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 2
done

docker_cmd run --rm \
  --network "$NETWORK" \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  "$API_IMAGE" \
  npx prisma db push --schema packages/database/prisma/schema.prisma

docker_cmd rm -f "$API_CONTAINER" >/dev/null 2>&1 || true
docker_cmd run -d \
  --name "$API_CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  --network-alias api \
  -e API_PORT=4000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET" \
  -e JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  -e CORS_ORIGIN="$CORS_ORIGIN" \
  "$API_IMAGE" >/dev/null

docker_cmd rm -f "$LEGACY_WEB_CONTAINER" "$APP_CONTAINER" "$DASH_CONTAINER" >/dev/null 2>&1 || true
docker_cmd run -d \
  --name "$APP_CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  --network-alias pubo_app \
  --network-alias app \
  -p "${PUBO_HTTP_PORT}:80" \
  "$WEB_IMAGE" >/dev/null

docker_cmd run -d \
  --name "$DASH_CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" \
  --network-alias pubo_dash \
  --network-alias dash \
  "$WEB_IMAGE" >/dev/null

echo "Pub-O is running on http://ct-intra:${PUBO_HTTP_PORT}"
echo "API health: http://ct-intra:${PUBO_HTTP_PORT}/health"
