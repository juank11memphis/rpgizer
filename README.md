# RPGizer

RPGizer is a web app foundation for turning personal goals into RPG-style Adventures. This repository currently contains a Next.js App Router app, Tailwind styling, PostgreSQL/Drizzle tooling, Docker-based local database support, Google Sign-In, auth persistence tables, and planning documents for future product work.

This foundation intentionally does **not** include Adventure creation, AI/Game Master flows, deployment setup, or broader account-management features yet.

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

3. Fill in the local-only values in `.env.local`:

   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:15432/rpgizer
   AUTH_SECRET=replace-with-a-local-auth-secret
   GOOGLE_CLIENT_ID=replace-with-your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=replace-with-your-google-oauth-client-secret
   NEXTAUTH_URL=http://localhost:3002
   ```

`DATABASE_URL` is required for Drizzle commands. `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_URL` are required for local Google Sign-In. Keep `.env.local` local-only; do not commit real secrets or Google credentials.

## Google Sign-In local setup

RPGizer uses Google as the only sign-in provider for the MVP. To run it locally:

1. Create an OAuth client for a web application in Google Cloud.
2. Add this authorized redirect URI for the local Auth.js callback:

   ```text
   http://localhost:3002/api/auth/callback/google
   ```

3. Copy the OAuth client ID and client secret into `.env.local`:

   ```env
   GOOGLE_CLIENT_ID=replace-with-your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=replace-with-your-google-oauth-client-secret
   ```

4. Set `NEXTAUTH_URL` to the local app URL used by the callback:

   ```env
   NEXTAUTH_URL=http://localhost:3002
   ```

Generate a local `AUTH_SECRET` value for your machine and store it only in `.env.local`. Do not commit real OAuth credentials, generated secrets, tokens, or private Google project values.

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

The app serves the RPGizer landing experience and routes the start-adventure call to Google Sign-In before handing authenticated users to `/adventures/new`.

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

Google Sign-In persistence uses Drizzle-managed auth tables. Apply migrations to the configured database before validating sign-in persistence.

Generate migrations after schema changes:

```bash
pnpm db:generate
```

Apply generated migrations to the configured database:

```bash
pnpm db:migrate
```

For the local Docker database, start PostgreSQL first and run Drizzle commands with `.env.local` loaded or with `DATABASE_URL` provided in your shell:

```bash
docker compose up -d postgres
DATABASE_URL=postgres://postgres:postgres@localhost:15432/rpgizer pnpm db:migrate
```

These migrations create the auth persistence tables needed for first-time and returning Google sign-in sessions.

## Validation commands

Run the application checks individually:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

There is no combined `validate` script yet. Use the explicit sequence above for application validation.

Database-related validation:

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
