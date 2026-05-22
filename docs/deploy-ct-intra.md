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
CORS_ORIGIN=https://int.app.pub-o.com,https://int.dash.pub-o.com
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

Public access should use the Cloudflare Tunnel URLs:

```text
https://int.app.pub-o.com
https://int.dash.pub-o.com
https://int.api.pub-o.com
```

The browser-facing app and admin dashboard call the API through `https://int.api.pub-o.com/api/*`.

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

## 5. HTTPS and Cloudflare Tunnel Settings

The Docker-side origin remains plain HTTP inside the private Docker network. Public HTTPS is terminated by Cloudflare Tunnel, and Nginx adds strict browser security headers.

Recommended Cloudflare Public Hostname settings:

- Route `https://int.app.pub-o.com` to `http://pubo_web:8080`.
- Route `https://int.dash.pub-o.com` to `http://pubo_web:8080`.
- Route `https://int.api.pub-o.com` to `http://pubo_api:4000`.
- Attach cloudflared to `pubo_network` so those Docker DNS names resolve.
- The deploy script also adds the Docker network alias `pub_o` to the web container for compatibility with Cloudflare-managed tunnel targets such as `http://pub_o:8080`.
- SSL/TLS mode: Full.
- Edge Certificates: Always Use HTTPS enabled.
- Minimum TLS version: TLS 1.2 or newer.
- Automatic HTTPS Rewrites enabled.
- HSTS enabled only after confirming the hostname works over HTTPS. Suggested values: `max-age=31536000`, include subdomains, preload.

The app also sends these headers from Nginx:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
