# Step: Add the RPGizer landing shell

## Goal

Replace the default starter page with a minimal RPGizer-branded landing shell that proves App Router rendering and Tailwind styling work without introducing product flows.

## Scope

- Keep `src/app/page.tsx` as a Server Component with no browser-only APIs, state, effects, or event handlers.
- Use Tailwind utility classes directly for visible layout, typography, color, and spacing.
- Include concise RPGizer branding language that communicates this is a foundation surface.
- Keep `src/app/layout.tsx` focused on root HTML/body structure and metadata.
- Do not add Start Adventure actions, authentication, Game Master chat, roadmap, quest, skill, inventory, achievement, boss fight, or real product data behavior.

## Files

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

## Done when

- The default route renders a minimal RPGizer-branded landing shell.
- Tailwind styling is visibly used by the landing shell.
- `src/app/page.tsx` remains a Server Component without a `"use client"` directive.
- The shell remains a scaffold validation surface, not binding product UX.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-06-30T00:15:37Z
