# Report Forge Progress from Adventure Generation

## Epic

[Forge Road Progress](../epic_brief.md)

## User Story

As a User waiting for my Adventure to be forged, I want the backend generation flow to report meaningful stage progress, so that the UI can show truthful progress instead of a generic spinner.

## Context

The existing forge orchestration already creates/reuses the Interview Output Artifact, calls Adventure Planner, and persists the generated Adventure. The Adventure Planner already performs content generation, dependency linking, XP balancing, final assembly, and validation. This story adds a narrow progress-reporting seam without changing product scope or exposing provider internals.

## Scope

- Add typed forge progress stage/status vocabulary at the application boundary.
- Extend `forgeAdventure(...)` with an optional progress reporter while preserving existing non-stream callers.
- Add progress reporting around Interview Output Artifact creation/reuse.
- Add progress reporting through the Adventure Planner generation path for roadmap content, connections, XP/rewards, and final opening stages.
- Keep progress vocabulary product/application-level, not OpenAI/provider-level.
- Preserve existing generated Adventure persistence and idempotency behavior.

## Out of Scope

- SSE Route Handler implementation.
- Forge Road UI components.
- New database tables, queues, workers, or durable job state.
- User-facing progress labels; labels belong in the UI layer.

## Acceptance Criteria

- The forge use case can report `quest_lore`, `adventure_roadmap`, `connections`, `xp_rewards`, and `opening_adventure` stage progress.
- Existing callers can invoke forge generation without providing a progress reporter.
- Artifact reuse and generated Adventure reuse paths still produce sensible progress completion behavior.
- Recoverable failure and not-confirmed paths do not emit misleading completed progress.
- Progress reporting does not leak prompts, generated Adventure content, provider details, or raw backend step names.

## Validation

- Unit/application tests cover progress reporter order for success, artifact reuse, generated Adventure reuse, not-confirmed, and recoverable failure paths.
- Adventure Planner tests cover content/linking/XP progress callback behavior.
- Existing forge and Adventure Planner tests continue to pass.
