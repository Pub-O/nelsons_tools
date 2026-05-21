# Pub-O

Pub-O, short for **Pub-Organizer**, is being shaped into a mobile-first management app for small and medium pubs, bars, clubs, and hospitality teams.

The old static tools still live in `nginx/html`. The new app foundation is a TypeScript monorepo with:

- `apps/web`: React + Vite PWA for smartphone-style usage
- `apps/api`: Fastify API with auth, security middleware, and OpenAPI docs
- `packages/database`: Prisma + PostgreSQL data model
- `docker-compose.yml`: local PostgreSQL database

## Core Modules

- Dashboard for daily operations
- Stock and inventory counts
- Shopping and supplier lists
- Shifts and staff planning
- Opening, closing, and cleaning checklists
- Handover notes between teams

## Getting Started

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

4. Generate the Prisma client and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start API and web app:

   ```bash
   npm run dev
   ```

The web app runs on `http://localhost:5173`.
The API runs on `http://localhost:4000`.
API documentation is available at `http://localhost:4000/docs`.

## Docker Deployment on ct-intra

Use the production-style compose file for the internal host:

```bash
cp .env.ct-intra.example .env.ct-intra
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml build
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml up -d postgres
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml --profile tools run --rm schema-sync
docker compose --env-file .env.ct-intra -f docker-compose.ct-intra.yml up -d
```

See `docs/deploy-ct-intra.md` for the full deployment notes.

If `ct-intra` only has the plain Docker CLI, use:

```bash
sh scripts/deploy-ct-intra-docker.sh
```

## Security Direction

The API is designed around short-lived access tokens, refresh tokens, Argon2 password hashing, rate limiting, request validation, CORS, Helmet, and location-aware authorization. Critical inventory changes are stored as stock movements so the system can audit how stock changed over time.
