# Deploy Pub-O on ct-intra

This deployment runs Pub-O as three Docker services:

- `web`: Nginx serving the PWA and reverse-proxying API routes
- `api`: Fastify API
- `postgres`: PostgreSQL database with a persistent Docker volume

## 1. Prepare Environment

On `ct-intra`, clone or update this repository, then create the deployment env file:

```bash
cp .env.ct-intra.example .env.ct-intra
```

Edit `.env.ct-intra` and replace all secrets:

```bash
POSTGRES_PASSWORD=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=http://ct-intra:8080,https://int-web.pub-o.com
PUBO_HTTP_PORT=8080
```

Use long random values for both JWT secrets.
Keep `POSTGRES_PASSWORD` URL-safe: avoid characters such as `:`, `/`, `@`, `?`, and `#`.

## 2. Build and Start

If `docker compose` is available on `ct-intra`, use:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml build
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml up -d postgres
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml --profile tools run --rm schema-sync
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml up -d
```

The current `ct-intra` host only has the plain Docker CLI. In that case use:

```bash
sh scripts/deploy-ct-intra-docker.sh
```

If your user is not in the Docker group, run it with a Docker command wrapper:

```bash
DOCKER_CMD="sudo docker" sh scripts/deploy-ct-intra-docker.sh
```

On the current `ct-intra` check, user `dsamwald` could connect over SSH but did not have permission to access `/var/run/docker.sock`, and passwordless `sudo docker` was not available.

The app is then available at:

```text
http://ct-intra:8080
```

If port `80` is free on `ct-intra`, set this in `.env.ct-intra`:

```bash
PUBO_HTTP_PORT=80
```

Then Pub-O will be available at:

```text
http://ct-intra
```

## 3. Useful Commands

Check service status:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml ps
```

View logs:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml logs -f api web
```

Apply schema changes after an update:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml --profile tools run --rm schema-sync
```

Restart the stack:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml up -d --build
```

Stop the stack:

```bash
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml down
```

The PostgreSQL data remains in the `pubo_postgres_data` Docker volume unless that volume is deleted explicitly.

## 4. Health Checks

Web container health:

```text
http://ct-intra:8080/healthz
```

API health through Nginx:

```text
http://ct-intra:8080/health
```

API docs:

```text
http://ct-intra:8080/docs
```
