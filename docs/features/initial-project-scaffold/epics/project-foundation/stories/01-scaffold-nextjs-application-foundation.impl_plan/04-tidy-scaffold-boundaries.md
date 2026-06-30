# Step: Tidy scaffold boundaries

## Goal

Remove starter clutter and confirm the scaffold remains narrowly focused on the foundation required by this story.

## Scope

- Remove or replace default starter assets, imports, and copy that conflict with the RPGizer landing shell.
- Keep configuration and App Router files readable, simple, and consistent with generated conventions.
- Verify no empty `src/modules/**` product folders or speculative domain/application/infrastructure code were added.
- Do not refactor generated tooling beyond what is needed for a clean scaffold.

## Files

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `public/*`
- `package.json`
- `tsconfig.json`
- `eslint.config.*`
- `next.config.*`

## Done when

- The scaffold contains no misleading default starter UI on the default route.
- App Router files are thin and focused on framework/rendering concerns.
- TypeScript and configuration choices favor clarity, simplicity, and generated defaults.
- No product modules, database files, Docker files, or README completion work appear in this story's changes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-06-30T00:15:37Z
