# Complete, Retry, and Recover the Forge Flow

## Epic

[Forge Road Progress](../epic_brief.md)

## User Story

As a User whose Adventure forge succeeds, fails, or stalls, I want a clear outcome and safe recovery path, so that I know what happened and can continue without losing my interview work.

## Context

The feature brief requires auto-redirect on success with a success toast, and a friendly failure/stall state with **Try again** and **Back to interview**. The detail page contents are out of scope, but it must serve as the destination and toast host.

## Scope

- Close the EventSource on terminal `complete` and redirect to the Adventure Detail Page.
- Show **Adventure forged.** as a success toast after redirect.
- Close the EventSource on terminal `error` and show the Forge Road failure/stall state.
- Implement **Try again** by restarting the request-bound SSE forge flow for the same Adventure.
- Implement **Back to interview** to return to the Adventure Interview.
- Add client-side stall handling that shows recoverable failure UI without claiming a backend failure.
- Ensure retry/reopen behavior reuses existing artifact/generated Adventure when already persisted.

## Out of Scope

- Designing or filling the Adventure Detail Page content beyond the success toast.
- Durable return-later behavior after browser close.
- New job status pages, notification systems, or hosted generation history.
- Raw error details or technical diagnostics in user-facing recovery copy.

## Acceptance Criteria

- A terminal `complete` event redirects the User to the Adventure Detail Page.
- The destination shows **Adventure forged.** once after successful redirect.
- A terminal `error` event shows **The forge needs another spark.** with safe recovery copy.
- **Try again** starts a fresh EventSource flow without requiring a full manual route change.
- **Back to interview** returns to `/adventures/[adventureId]/interview`.
- Stall/reconnecting behavior is calm and does not expose implementation details.
- Closing, completing, erroring, retrying, or unmounting the screen closes the active EventSource.

## Validation

- Client tests cover complete redirect, success toast trigger, terminal error state, retry restart, Back to interview link, stall state, and EventSource cleanup.
- Manual check covers success, recoverable failure, retry after failure, closing/navigating away, and reopening after an Adventure has already been generated.
