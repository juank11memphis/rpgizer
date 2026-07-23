# Stream Forge Progress over SSE

## Epic

[Forge Road Progress](../epic_brief.md)

## User Story

As a User waiting on the forge page, I want the browser to receive live server progress events, so that I can see that Adventure generation is still moving.

## Context

The technical design chooses a request-bound SSE MVP. Generation starts when the forge page Client Component opens one EventSource connection to a Node.js Route Handler. The stream is not a durable job runner and does not guarantee completion after browser close.

## Scope

- Add `GET /adventures/[adventureId]/forge/events` as a dynamic Node.js App Router Route Handler.
- Authenticate the current User and call only the Game Master Assistant composition/application boundary.
- Return correctly formatted `text/event-stream` responses with connected, progress, complete, error, and heartbeat events.
- Run request-bound forge generation inside the SSE request.
- Clean up heartbeat/stream resources on terminal events and abort.
- Emit safe structured lifecycle logs for stream opened, completed, expected error, unexpected error, and client disconnect.

## Out of Scope

- Durable background execution after navigation/browser close.
- Persisted progress replay.
- Forge Road visual implementation.
- Direct route imports of repositories, database clients, SDKs, or Adventure Planner infrastructure.

## Acceptance Criteria

- The SSE route sends a `connected` event before generation work begins.
- Progress reporter callbacks are serialized as valid named SSE `progress` events.
- Successful forge output produces one terminal `complete` event with a safe destination.
- Expected failure states produce one terminal safe `error` event.
- Heartbeats keep quiet streams alive without updating visible progress.
- Stream cleanup runs when the request is aborted or terminal.
- Response headers prevent caching and identify the stream as SSE.

## Validation

- Tests cover SSE event formatting, heartbeat formatting, headers, auth behavior, terminal success/error behavior, and abort cleanup where practical.
- Manual check confirms a generated Adventure can be forged through the SSE route and logs do not include sensitive payloads.
