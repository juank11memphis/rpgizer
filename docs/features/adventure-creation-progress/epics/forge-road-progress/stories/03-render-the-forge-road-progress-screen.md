# Render the Forge Road Progress Screen

## Epic

[Forge Road Progress](../epic_brief.md)

## User Story

As a User who clicked **Forge My Adventure**, I want an RPG-native progress screen that clearly shows where my Adventure is in the forge, so that the wait feels intentional and trustworthy.

## Context

The approved UX requires The Forge Road: a non-pixel, illustrated side-scrolling journey with a cloaked traveler, five visible stations, a text stage list, reduced-motion support, and no fake percentages. The existing `/forge` route should become this progress page.

## Scope

- Replace the current static forge page content with a thin Server Component page and route-local Client Component.
- Render the Forge Road visual structure across phone, tablet, and desktop according to `ux.md` binding mockups.
- Show all five stages from the start, with completed/current/future states.
- Map SSE progress stages to user-facing labels from the UX spec.
- Include request-bound copy that asks the User to keep the window open while the Adventure is forged.
- Support reconnecting/temporarily quiet UI copy without showing a scary error.
- Respect reduced-motion preferences and provide text/checkmark progress independent of animation.

## Out of Scope

- Terminal success redirect/toast and failure recovery actions, except for placeholders needed to keep the screen deployable.
- SSE Route Handler implementation.
- Pixel-art asset generation or custom user avatar/profile behavior.
- Adventure Detail Page content.

## Acceptance Criteria

- `/adventures/[adventureId]/forge` renders the Forge Road progress screen for authenticated Users.
- The normal progress screen has no action buttons.
- The current stage headline, supporting copy, scene, and text stage list are visible and aligned with the UX spec.
- Future stages are visible but visually distinct from current/completed stages.
- The UI does not show percentages, backend labels, logs, IDs, provider names, or technical diagnostics.
- Reduced-motion mode preserves full progress meaning without relying on travel/particle animation.

## Validation

- Component/client tests cover stage rendering, stage-state updates, reconnecting copy, reduced-motion-safe text states, and absence of normal progress actions.
- Manual responsive review covers phone, tablet, and desktop layouts against `ux.md` mockups.
