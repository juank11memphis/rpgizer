# Step: Validate the scaffold

## Goal

Confirm the application foundation installs, runs, typechecks, lints, builds, and renders the expected minimal RPGizer landing shell.

## Scope

- Install dependencies with pnpm if they are not already installed.
- Run the scaffold validation commands for lint, typecheck, and production build.
- Start the Next.js development server long enough to verify the default route renders the RPGizer landing shell.
- Record any validation failures for the story-level review instead of masking them with unrelated changes.
- Do not validate database, Drizzle, Docker Compose, README setup instructions, or future product workflows in this story.

## Files

- `package.json`
- `pnpm-lock.yaml`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

## Done when

- `pnpm install` completes successfully or dependencies are already installed consistently with `pnpm-lock.yaml`.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes.
- The local development server serves the default route with the minimal RPGizer-branded landing shell.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-06-30T00:15:37Z
