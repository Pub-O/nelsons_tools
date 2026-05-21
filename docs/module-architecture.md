# Pub-O Module Architecture

Pub-O is moving from a monolithic app surface toward a module platform.

## Module Tiers

- Core modules are included in every subscription.
- Paid add-ons are optional modules that can be enabled per organization.

The frontend source of truth is `apps/web/src/modules/catalog.ts`.

Current core modules:

- Dashboard
- Bestand
- Einkauf
- Checklisten
- Admin

Current paid add-ons:

- Easy Count
- Dienstplanung

## Next Backend Step

Persist module access on the organization or subscription record, then filter module availability by that server-side entitlement. The frontend catalog should remain descriptive metadata; the backend should remain the authority for paid access.
