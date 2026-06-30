# RPGizer

RPGizer is a web app foundation for turning personal goals into RPG-style Adventures. This repository currently contains the initial application scaffold: a Next.js App Router app, Tailwind styling, PostgreSQL/Drizzle tooling, Docker-based local database support, and planning documents for future product work.

This scaffold intentionally does **not** include Adventure creation, AI/Game Master flows, authentication, deployment setup, or product database tables yet.

## Prerequisites

- Node.js compatible with the current Next.js toolchain
- pnpm 10.28.2, as declared in `package.json`
- Docker with Docker Compose for the local PostgreSQL database

## Fresh checkout setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Confirm `.env.local` contains the development database URL:

   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:15432/rpgizer
   ```

`DATABASE_URL` is required for Drizzle commands. Keep `.env.local` local-only; do not commit real secrets.

## Local development

Start the Next.js development server:

```bash
pnpm dev
```

Build and run the production server locally:

```bash
pnpm build
pnpm start
```

The app currently serves a minimal RPGizer-branded landing shell that validates the scaffold and styling setup.

## Local PostgreSQL

Start the development PostgreSQL service with Docker Compose:

```bash
docker compose up -d postgres
```

The Compose service is named `postgres` and exposes PostgreSQL on host port `15432` with these development defaults:

- user: `postgres`
- password: `postgres`
- database: `rpgizer`
- connection string: `postgres://postgres:postgres@localhost:15432/rpgizer`

Check the container state when needed:

```bash
docker compose ps postgres
```

## Drizzle workflow

Drizzle reads `DATABASE_URL` from the environment, uses `src/db/schema.ts` as the schema entrypoint, and writes migrations under `drizzle/`.

The current schema is intentionally empty for the project scaffold. Future approved persistence features should add product tables and migrations when their scope requires them.

Generate migrations after schema changes:

```bash
pnpm db:generate
```

Apply generated migrations to the configured database:

```bash
pnpm db:migrate
```

For the local Docker database, run Drizzle commands with `.env.local` loaded or with `DATABASE_URL` provided in your shell. Because the scaffold schema is currently empty, `pnpm db:generate` is expected to report no schema changes until an approved persistence feature adds tables. `pnpm db:migrate` is still valid and prepares Drizzle's migration tracking schema/table.

## Validation commands

Run the scaffold checks individually:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

There is no combined `validate` script yet. Use the explicit sequence above for application validation.

Database-related validation for the current scaffold:

```bash
docker compose up -d postgres
docker compose ps postgres
DATABASE_URL=postgres://postgres:postgres@localhost:15432/rpgizer pnpm db:migrate
```

## Product and planning docs

High-level product and domain context lives under `docs/`:

- `docs/product-vision.md`
- `docs/business-domain-model.md`
- `docs/capabilities-map.md`
- `docs/deep-module-map.md`

Initial scaffold planning lives under `docs/features/initial-project-scaffold/`:

- `docs/features/initial-project-scaffold/feature_brief.md`
- `docs/features/initial-project-scaffold/technical_design.md`
- `docs/features/initial-project-scaffold/epics/project-foundation/epic_brief.md`
- `docs/features/initial-project-scaffold/epics/project-foundation/stories/`
