# Project Foundation Epic Brief

## Summary

Deliver the baseline RPGizer project foundation: a runnable Next.js application with Tailwind, PostgreSQL/Drizzle setup, local Docker database support, useful project commands, and a complete README. This Epic enables future product features without introducing Adventure, auth, AI, or product data behavior.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Scaffold the Next.js App Router application with TypeScript, `src/`, Tailwind, ESLint, and pnpm.
- Add a minimal RPGizer-branded landing shell.
- Configure PostgreSQL, Drizzle ORM, Drizzle migration tooling, and Docker Compose for local Postgres.
- Add clear development, validation, and database workflow commands.
- Replace the minimal README with complete setup and workflow documentation.

## Out of Scope

- Google auth, users, sessions, or ownership behavior.
- AI/Game Master behavior.
- Adventure creation, roadmap generation, progression, or product data models.
- Product database tables or migrations beyond minimal migration infrastructure.
- Full product UX design.

## User Stories

- [Scaffold the Next.js application foundation](./stories/01-scaffold-nextjs-application-foundation.md)
- [Add PostgreSQL and Drizzle development foundation](./stories/02-add-postgres-drizzle-development-foundation.md)
- [Document and validate the project workflow](./stories/03-document-and-validate-project-workflow.md)

## Acceptance Criteria

- The repository has a runnable Next.js application using pnpm, TypeScript, App Router, `src/`, Tailwind, and ESLint.
- The default route displays a minimal RPGizer-branded landing shell without product flows.
- PostgreSQL local development is supported through Docker Compose.
- Drizzle ORM and migration commands are configured without introducing product tables.
- Common development, build, lint, typecheck, validation, and database commands are discoverable.
- The README accurately explains setup and workflows for a fresh checkout.

## Dependencies / Risks

- Current Next.js/Tailwind scaffold defaults may vary; implementation should preserve generated defaults where reasonable.
- Database setup must avoid premature product schema decisions.
- The landing shell should remain a scaffold validation surface, not unapproved product UX.
