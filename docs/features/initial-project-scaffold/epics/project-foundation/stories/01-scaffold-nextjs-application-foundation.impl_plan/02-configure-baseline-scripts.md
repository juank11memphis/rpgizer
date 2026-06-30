# Step: Configure baseline project scripts

## Goal

Provide discoverable package scripts for local development, production build, linting, and TypeScript typechecking required by this scaffold story.

## Scope

- Add or verify `dev`, `build`, `start`, `lint`, and `typecheck` scripts in the package manifest.
- Use conventional Next.js and TypeScript commands that match the installed scaffold tooling.
- Add only placeholders that are strictly required by the scaffold story, if any scaffold-generated command needs them.
- Do not add database, Drizzle, Docker, validation aggregate, README, or future product workflow scripts in this step.

## Files

- `package.json`

## Done when

- `pnpm dev` starts the local Next.js development server.
- `pnpm build` runs the production build.
- `pnpm lint` runs the configured lint command.
- `pnpm typecheck` runs TypeScript with `--noEmit`.
- No out-of-scope database or product scripts are introduced by this story.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-06-30T00:15:37Z
