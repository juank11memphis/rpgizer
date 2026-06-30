# Document and Validate the Project Workflow

## Epic

[Project Foundation](../epic_brief.md)

## User Story

As a developer, I want a complete README and clear validation workflow, so that I can set up, run, and verify RPGizer from a fresh checkout without hidden knowledge.

## Context

The feature brief requires a clean, complete README covering project overview, prerequisites, environment setup, local development, Docker Postgres startup, Drizzle migration commands, build/lint/typecheck commands, and planning document locations. The technical design requires README instructions to match actual commands.

## Scope

- Replace the minimal README with a complete project README.
- Document prerequisites: Node.js, pnpm, and Docker.
- Document setup steps and environment variables.
- Document local Postgres startup with Docker Compose.
- Document app development commands.
- Document Drizzle migration generation/application commands.
- Document lint, typecheck, build, and validation commands.
- Document where product and planning docs live.
- Verify README commands match the actual project scripts and files.

## Out of Scope

- Product usage documentation for Adventure creation or AI flows.
- Deployment documentation.
- Authentication setup documentation.
- Documentation for product schemas that do not exist yet.

## Acceptance Criteria

- README explains what RPGizer is at a high level.
- README has enough setup detail for a fresh checkout.
- README documents all common project commands accurately.
- README describes the local database workflow.
- README points contributors to the product/planning docs.
- Validation commands pass, or any unavoidable scaffold limitation is clearly captured for follow-up.

## Validation

- Follow the README commands from a clean working tree perspective.
- Run lint, typecheck, build, and database-related validation available after the prior stories.
- Confirm README does not describe out-of-scope product behavior.

## Notes

- This story should be done after the scaffold and database foundation exist so documentation can reflect real commands.
