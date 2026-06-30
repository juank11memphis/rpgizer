# Add PostgreSQL and Drizzle Development Foundation

## Epic

[Project Foundation](../epic_brief.md)

## User Story

As a developer, I want local PostgreSQL and Drizzle migration tooling configured, so that future persistence features can add product data safely without reworking the foundation.

## Context

The feature brief requires PostgreSQL, Drizzle ORM via `drizzle-orm`, Drizzle migrations, Docker Compose for local Postgres, and clear database commands. The technical design requires no product tables or product migrations in this scaffold feature.

## Scope

- Add Drizzle ORM and migration tooling dependencies.
- Add a PostgreSQL driver compatible with the selected Drizzle setup.
- Configure Drizzle to read `DATABASE_URL` from the environment.
- Configure a conventional migrations directory such as `drizzle/`.
- Add Docker Compose support for local PostgreSQL using development defaults: user `postgres`, password `postgres`, database `rpgizer`.
- Add `.env.example` documenting the local `DATABASE_URL`.
- Add database scripts for migration generation and application.

## Out of Scope

- Product tables for Users, Adventures, Roadmaps, Quests, Skills, Inventory, Achievements, or Boss Fights.
- Real product migrations.
- Google auth persistence.
- A generic repository/database module.
- Production database credentials or deployment configuration.

## Acceptance Criteria

- Local PostgreSQL can be started with Docker Compose.
- `.env.example` documents a working development `DATABASE_URL`.
- Drizzle configuration exists and uses `DATABASE_URL`.
- Drizzle migration generation and migration application commands are available through package scripts.
- The database setup does not introduce product domain tables or speculative schema.
- Real secrets and `.env.local` remain uncommitted.

## Validation

- Start local PostgreSQL with Docker Compose.
- Confirm database commands are present and documented by scripts.
- Run Drizzle commands against the configured local database where possible without product tables.
- Confirm no product schema or product migration is added.

## Notes

- Each future product module should own its own persistence needs internally; do not create a shared repository module here.
