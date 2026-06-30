# Initial Project Scaffold Feature Brief

## Summary

The Initial Project Scaffold establishes RPGizer's baseline application foundation so future product features can be built consistently. It should create a clean default Next.js project using pnpm, Tailwind CSS, PostgreSQL, Drizzle ORM, Drizzle migrations, Docker Compose for local Postgres, useful project commands, and a complete README. It intentionally avoids AI/Game Master behavior, Google auth, Adventure creation, and product data modeling.

## Product Vision Fit

This feature is not the RPGizer experience itself, but it enables the product vision by creating the foundation for a fast, maintainable web app where Adventures, progress, and future Game Master flows can live.

It should preserve the product direction by keeping the scaffold simple, clean, and ready for RPG-native product work without prematurely adding generic productivity or AI behavior.

## Business Domain Model Fit

Relevant domain implications:

- Future RPGizer features require authenticated Users, Adventures, Roadmaps, progress, Skills, Inventory, Achievements, and Game Master conversations.
- This scaffold must not prematurely define those product concepts as database tables or flows.
- The feature supports future User-owned Adventures and persistence, but does not introduce business behavior yet.
- Google auth is intentionally deferred to a later feature.
- AI/Game Master behavior is intentionally deferred to later features.

## Capability Coverage

This feature supports existing capabilities indirectly by preparing the foundation for them:

- **User Identity / Authenticate with Google**: deferred, but the scaffold should not block future auth integration.
- **Adventure Creation / Start a New Adventure**: deferred, but the app foundation should be ready for future routes and persistence.
- **Adventure Progression**: deferred, but database and migration foundations prepare for future progress state.
- **Adventure Presentation**: lightly supported through a minimal RPGizer-branded landing shell proving the app can present product UI with Tailwind.

## User / Customer Problem

The immediate “user” for this feature is the product developer. Without a clear scaffold, future feature work risks inconsistent setup, unclear commands, missing database workflow, and a weak README that slows development.

## Business Goal

Create a stable, easy-to-run foundation for RPGizer so future product features can be implemented without reworking the project baseline.

## Target User / Scenario

A developer opens the repo and should be able to understand what RPGizer is, install dependencies with pnpm, start local Postgres, run the app, use Drizzle migrations, and validate the project with clear commands.

## Proposed Experience

The repository should feel like a clean, intentional RPGizer project from the first checkout:

- A default Next.js application scaffold exists.
- Tailwind CSS is configured and usable.
- The initial UI is a minimal RPGizer-branded landing shell, not a full product flow.
- PostgreSQL is available locally through Docker Compose.
- Drizzle ORM and migrations are configured.
- Common commands are easy to discover and run.
- The README explains the project and local development workflow clearly.

## MVP Scope

- Scaffold a Next.js app using the default Next.js setup.
- Use pnpm as the package manager.
- Configure Tailwind CSS.
- Configure PostgreSQL as the database target.
- Add Drizzle ORM using the `drizzle-orm` npm package.
- Add Drizzle migration tooling and project commands for migration generation and application.
- Add Docker Compose support for local PostgreSQL.
- Provide useful project commands for local development, build, lint/typecheck, and database workflow.
- Replace the default starter page with a minimal RPGizer-branded landing shell.
- Write a clean, complete `README.md` covering:
  - project overview
  - prerequisites
  - environment setup
  - local development
  - Docker Postgres startup
  - Drizzle migration commands
  - build/lint/typecheck commands
  - where planning/product docs live

## Out of Scope

- Google auth.
- User accounts or sessions.
- AI/Game Master behavior.
- Adventure creation flow.
- Adventure Detail Page.
- Roadmap generation.
- Quest, Skill, Inventory, Achievement, or Boss Fight product models.
- Product database tables beyond whatever minimal migration infrastructure is required.
- Manual or chat-based Adventure editing.
- Full UX design for the product experience.

## Success Signals

- A developer can set up and run the project from the README without needing hidden knowledge.
- The app starts locally and shows a minimal RPGizer-branded landing shell.
- Local Postgres can be started repeatably through Docker Compose.
- Drizzle migration commands are present and understandable.
- Build and validation commands exist and are documented.
- The scaffold does not prematurely implement product behavior that belongs in later features.

## Business-Level Acceptance Criteria

- The repository contains a Next.js app foundation using pnpm.
- Tailwind CSS is configured and demonstrably used by the initial landing shell.
- PostgreSQL is the configured database target.
- Drizzle ORM and Drizzle migrations are available through clear project commands.
- Docker Compose can provide local PostgreSQL for development.
- The initial UI is RPGizer-branded but does not include real Adventure or AI flows.
- The README clearly explains setup, development, database, validation, and documentation locations.
- Google auth, AI behavior, Adventure data models, and product flows remain out of scope.

## Risks / Tradeoffs

- Adding too much product behavior during scaffolding could blur later feature boundaries.
- Leaving setup commands unclear would slow every future feature.
- Database setup should be real enough to support future work, but not force premature product schema decisions.
- The landing shell should signal RPGizer's identity without becoming a substitute for proper UX work later.
