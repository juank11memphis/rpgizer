# Scaffold the Next.js Application Foundation

## Epic

[Project Foundation](../epic_brief.md)

## User Story

As a developer, I want a clean Next.js application foundation, so that future RPGizer features can be built on a consistent web app baseline.

## Context

The feature brief calls for a default Next.js scaffold using pnpm, Tailwind, PostgreSQL, Drizzle, useful commands, and a complete README. The technical design specifies App Router, TypeScript, `src/`, Tailwind, ESLint, and a minimal RPGizer-branded landing shell.

## Scope

- Create the Next.js application scaffold with App Router, TypeScript, `src/`, Tailwind, ESLint, and pnpm.
- Add the expected baseline project files such as package manifest, Next config, TypeScript config, ESLint config, and App Router files.
- Replace the default starter page with a minimal RPGizer-branded landing shell.
- Keep `src/app/page.tsx` as a Server Component unless scaffold defaults require otherwise.
- Include project scripts for local development, build, lint, and typecheck.

## Out of Scope

- Google auth.
- AI/Game Master behavior.
- Adventure, roadmap, quest, skill, inventory, achievement, or boss fight product flows.
- Product module folders under `src/modules/**`.
- Database setup, Drizzle setup, Docker Compose, and README completion, except where package scripts need placeholders for later stories.

## Acceptance Criteria

- The app can be installed and run with pnpm.
- The default route renders a minimal RPGizer-branded landing shell.
- Tailwind styles are visibly used by the landing shell.
- The scaffold uses App Router, TypeScript, and `src/`.
- Development, build, lint, and typecheck scripts are present.
- No product behavior or product data models are introduced.

## Validation

- Run dependency installation with pnpm.
- Start the Next.js development server and verify the landing shell renders.
- Run lint, typecheck, and build commands after the scaffold is created.

## Notes

- Follow generated Next.js/Tailwind defaults where reasonable.
- The landing shell is a scaffold validation surface, not binding UX for future product flows.
