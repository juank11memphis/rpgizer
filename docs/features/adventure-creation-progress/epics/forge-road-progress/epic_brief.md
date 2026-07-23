# Forge Road Progress Epic Brief

## Summary

Deliver the Adventure Creation Progress experience that replaces the current static forge completion/failure flow with a request-bound SSE progress page. The Epic makes the 30–60 second Adventure generation wait feel trustworthy, RPG-native, and recoverable while keeping MVP scope simple: no queue, worker, or durable job table.

## Source Context

- Feature brief: `../../feature_brief.md`
- UX spec: `../../ux.md`
- Technical design: `../../technical_design.md`

## Scope

- Emit coarse forge progress from the existing Game Master Assistant and Adventure Planner generation flow.
- Stream progress through an authenticated Next.js SSE Route Handler.
- Replace `/adventures/[adventureId]/forge` with the Forge Road progress screen.
- Show truthful RPG-facing stage progress without fake percentages or backend labels.
- Support request-bound MVP copy that tells Users to keep the window open.
- Handle success redirect, success toast, retry, reconnecting, failure, and stall states.
- Preserve current final-output persistence and idempotent reuse behavior.

## Out of Scope

- Durable background jobs, queues, workers, workflows, or progress-event tables.
- Return-later generation management after browser close.
- Filling out the Adventure Detail Page beyond serving as the redirect destination and success toast host.
- Manual roadmap editing, whole-roadmap regeneration, or generic progress infrastructure for other workflows.
- Exposing raw prompts, provider payloads, logs, backend event names, or technical diagnostics to Users.

## User Stories

- [Report Forge Progress from Adventure Generation](./stories/01-report-forge-progress-from-adventure-generation.md)
- [Stream Forge Progress over SSE](./stories/02-stream-forge-progress-over-sse.md)
- [Render the Forge Road Progress Screen](./stories/03-render-the-forge-road-progress-screen.md)
- [Complete, Retry, and Recover the Forge Flow](./stories/04-complete-retry-and-recover-the-forge-flow.md)

## Acceptance Criteria

- A confirmed Interview User who clicks **Forge My Adventure** lands on the Forge Road progress experience at the existing `/forge` route.
- Progress stages are backed by real forge generation events and displayed with RPG-facing labels.
- The page asks the User to keep the window open during request-bound generation.
- The EventSource stream closes cleanly on terminal success/failure and page unmount.
- Successful generation redirects to the Adventure Detail Page and shows **Adventure forged.**
- Failure or stall presents safe recovery with **Try again** and **Back to interview**.
- No queues, job tables, backend diagnostics, raw generation content, or fake percentages are introduced.

## Dependencies / Risks

- The request-bound MVP cannot guarantee completion after browser close; copy and recovery behavior must not imply otherwise.
- Reconnects may start another forge stream; existing idempotent persistence must protect against duplicate generated Adventures.
- The Forge Road UI must preserve the binding UX direction without becoming one oversized Client Component.
