# Pub-O Architecture

Pub-O is designed as a multi-tenant operations system for small and medium hospitality teams.

## Application Layers

- **Web app:** mobile-first React PWA, installable on phones and desktops.
- **API:** Fastify TypeScript service with validation, rate limiting, security headers, JWT authentication, and OpenAPI docs.
- **Database:** PostgreSQL with Prisma migrations and a ledger-style stock model.

## Tenant Model

`Organization` represents the operator, club, or company. `Location` represents one pub, bar, or venue. A user gets access through `Membership`, either organization-wide or location-specific.

Roles:

- `OWNER`: full organization access
- `MANAGER`: operational management
- `STAFF`: daily execution

## Stock Model

Stock uses two complementary tables:

- `StockItem`: current quantity for a product at a location
- `StockMovement`: immutable history of changes

Every inventory count creates `StockCountLine` rows and matching `StockMovement` rows. This keeps day-to-day reads fast while preserving a useful audit trail.

## API Security

The initial API foundation includes:

- Argon2 password hashing
- short-lived JWT access tokens
- persisted refresh-token hashes
- per-minute rate limiting
- Helmet security headers
- CORS allow-listing through environment config
- request validation through JSON Schema
- location-aware authorization helpers

## Near-Term Roadmap

1. Add refresh-token rotation and logout endpoints.
2. Add create/update routes for purchase lists, shifts, checklists, and handover notes.
3. Add seed data for local demos.
4. Add API tests with a disposable PostgreSQL database.
5. Add offline write queue in the PWA for stock counts and checklists.
