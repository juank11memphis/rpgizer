# SSE UI Best Practices for Next.js on Vercel

Researched: 2026-07-23

This note summarizes Server-Sent Events (SSE) best practices in three layers:

1. UI/product usage in general.
2. Next.js App Router implementation.
3. Deployment on Vercel Functions.

## Executive Recommendation

Use SSE when the UI needs **server-to-browser progress updates** and the browser does not need to push frequent messages back over the same connection. Good fits include AI generation progress, eval-run logs, import/export progress, job status, notifications, and read-only live feeds.

Prefer WebSockets or another bidirectional realtime system when the UI needs low-latency two-way collaboration, presence, cursors, chat, or client-to-server event streams. Prefer durable queues/workflows when the work must continue reliably after the browser disconnects.

For Next.js on Vercel, the safest pattern is:

- Start work through a normal mutation endpoint when the job must be durable.
- Store job state/events in a durable store.
- Use a `GET` Route Handler that streams `text/event-stream` events from that store.
- Let the client reconnect with `EventSource`, resume from event IDs when possible, and close streams explicitly on unmount.
- Configure function `maxDuration` intentionally and design for reconnects because Vercel Functions can be recycled or hit duration limits.

## 1. General SSE Best Practices for UIs

### Use SSE for one-way server updates

SSE is a browser-native way for the server to push text events to the page over HTTP. The client API is `EventSource`. It is simpler than WebSockets because it is one-way: browser opens a connection; server sends events; browser receives them.

Good UI use cases:

- Long-running AI generation progress.
- Eval/test-run status updates.
- Background task progress.
- Notification feeds.
- Read-only dashboards.
- Log-like streams where occasional reconnects are acceptable.

Avoid SSE when:

- The browser needs to send many realtime messages back on the same connection.
- You need multiplayer semantics, live cursors, high-frequency bidirectional events, or presence.
- Messages must be durably processed even if the user closes the browser.

### Define a small event protocol

Do not stream arbitrary text without a contract. Define event names and payload shapes.

Recommended event types:

- `connected`: confirms stream initialization and includes stream/job metadata.
- `progress`: coarse progress updates.
- `log`: optional user-safe log line.
- `artifact`: generated partial output or preview.
- `warning`: recoverable issue.
- `error`: terminal or non-terminal error with safe message.
- `complete`: terminal success.
- `heartbeat`: optional named heartbeat, or use SSE comment lines.

Recommended payload fields:

```ts
type SseEnvelope<T> = {
  runId: string;
  sequence: number;
  timestamp: string;
  data: T;
};
```

Keep payloads small. Send references/IDs for large artifacts and let the UI fetch full details separately.

### Format SSE correctly

Each event is UTF-8 text. Separate events with a blank line.

Common fields:

```text
id: 42
event: progress
data: {"percent":40,"label":"Generating quests"}

```

Rules:

- Use `event:` for named events and `addEventListener()` on the client.
- Use `data:` for JSON strings.
- Use `id:` for resumability.
- Use `retry:` only when you intentionally want to suggest browser reconnection delay.
- End every event with `\n\n`.
- Use comment frames such as `: heartbeat\n\n` to keep idle connections alive.

### Design for reconnects

`EventSource` reconnects automatically when the connection drops. Treat disconnects as normal, not exceptional.

Best practices:

- Include monotonically increasing event IDs.
- Support `Last-Event-ID` when practical.
- Make events replayable from durable state when the stream represents important progress.
- Make terminal states (`complete`, terminal `error`) fetchable through a normal status endpoint.
- On the client, close the `EventSource` when the user leaves the screen or starts a different run.

### Do not make the SSE stream the source of truth

The browser can miss events during reconnects, tab suspension, mobile sleep, network changes, or deploys. Use SSE as a delivery channel, not as the only state store.

For important workflows:

- Persist run/job state server-side.
- Render current state from a normal initial query.
- Use SSE to incrementally update the UI.
- Re-fetch final state after `complete` or after reconnect.

### Keep connections bounded

Browsers limit concurrent connections. MDN notes that non-HTTP/2 SSE can hit a low per-browser/per-domain limit around 6 connections. Even with HTTP/2, streams still consume server/client resources.

UI practices:

- Open at most one stream per active workflow/screen when possible.
- Multiplex related event types over one stream instead of opening many streams.
- Close streams on unmount, route change, completed jobs, and canceled jobs.
- Avoid opening duplicate streams in multiple React effects.

### Heartbeats and idle timeouts

Send heartbeat comments on quiet streams so intermediaries and clients know the connection is alive.

Typical interval: 15–30 seconds, adjusted to hosting/proxy behavior.

```text
: heartbeat

```

Heartbeats should not update user-visible progress unless they carry real state.

### Error and completion semantics

Separate transport errors from application errors.

- Transport error: `EventSource.onerror`; browser may reconnect.
- Application error: server sends `event: error` with safe details.
- Terminal success: server sends `event: complete`, then closes.
- Terminal failure: server sends `event: error`, then closes.

Client behavior:

- Show reconnecting state for transport errors if the job is still active.
- Stop reconnecting or close the source when a terminal event arrives.
- Provide a fallback “Refresh status” action.

### Security and privacy

- Authenticate and authorize stream access exactly like any other API endpoint.
- Never put secrets in event payloads.
- Prefer opaque run IDs over sensitive identifiers.
- Remember `EventSource` uses `GET`; avoid sensitive query strings if logs/proxies could retain them.
- If credentials/cookies are needed cross-origin, construct `EventSource` with `withCredentials: true` and configure CORS deliberately.
- Validate that the requesting user owns the job/run before streaming events.

### Observability

Log stream lifecycle, not every heartbeat.

Useful server logs:

- stream opened
- stream resumed with last event ID
- stream completed
- client disconnected/canceled
- stream error
- duration and event count

Avoid logging payloads that may include private user data.

## 2. Next.js App Router Best Practices

### Use Route Handlers for SSE endpoints

In App Router, implement SSE with a `GET` Route Handler under `app/api/**/route.ts`. Next.js Route Handlers use Web `Request` and `Response` APIs and support returning streams.

Example shape:

```ts
// app/api/runs/[runId]/events/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, context: RouteContext<"/api/runs/[runId]/events">) {
  const { runId } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown, id?: string) => {
        const lines = [
          id ? `id: ${id}` : undefined,
          `event: ${event}`,
          `data: ${JSON.stringify(data)}`,
          "",
        ].filter(Boolean);

        controller.enqueue(encoder.encode(`${lines.join("\n")}\n`));
      };

      send("connected", { runId });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

### Keep the route dynamic and uncached

For live streams:

- Use `dynamic = "force-dynamic"` when there is any risk of static optimization or caching confusion.
- Return `Cache-Control: no-cache, no-transform`.
- Do not use static caching primitives inside the stream handler.

### Choose runtime intentionally

Default to Node.js runtime for most application SSE endpoints, especially when you need:

- database clients
- auth/session helpers
- server-side SDKs
- longer function duration
- richer Node APIs

Consider Edge runtime only for lightweight globally distributed streams that can start quickly and do not need unsupported Node APIs. On Vercel Edge, the function must begin returning a response within 25 seconds and streaming can continue up to 300 seconds.

### Use abort signals for cleanup

`request.signal` tells you when the client disconnected. Use it to:

- clear heartbeat intervals
- unsubscribe from pub/sub
- stop polling loops
- release database/listener resources
- close the stream controller safely

Never leave intervals or subscriptions running after the stream closes.

### Keep Client Components responsible for `EventSource`

Use a small Client Component or hook for browser stream ownership.

Client-side pattern:

```tsx
"use client";

import { useEffect, useState } from "react";

type RunEvent = { type: string; payload: unknown };

export function useRunEvents(runId: string | null) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connectionState, setConnectionState] = useState<"idle" | "open" | "reconnecting" | "closed">("idle");

  useEffect(() => {
    if (!runId) return;

    const source = new EventSource(`/api/runs/${runId}/events`);

    source.onopen = () => setConnectionState("open");
    source.onerror = () => setConnectionState("reconnecting");

    source.addEventListener("progress", (event) => {
      setEvents((current) => [
        ...current,
        { type: "progress", payload: JSON.parse(event.data) },
      ]);
    });

    source.addEventListener("complete", (event) => {
      setEvents((current) => [
        ...current,
        { type: "complete", payload: JSON.parse(event.data) },
      ]);
      setConnectionState("closed");
      source.close();
    });

    return () => {
      source.close();
    };
  }, [runId]);

  return { events, connectionState };
}
```

Avoid creating `EventSource` in Server Components. Server Components render on the server; SSE connections belong in browser-owned Client Components.

### Use Server Actions or POST endpoints to start durable work

`EventSource` only performs `GET`. If starting work changes state:

1. Start the job with a Server Action or `POST /api/runs`.
2. Return a `runId`.
3. Open `GET /api/runs/:runId/events` for progress.

Do not start expensive, non-idempotent work merely because an SSE `GET` stream opened unless the operation is safe to restart on reconnect.

### Use a durable event source for important jobs

For serious workflows, avoid keeping all progress only in route-handler memory. Next.js route handlers may be restarted, scaled, or deployed independently.

Better approaches:

- Database table of run state and events.
- Redis/pub-sub plus persisted final state.
- Queue/workflow system for long-running work.
- Polling fallback endpoint for final state.

In-memory streams are acceptable for short, low-stakes progress where losing the stream is fine.

### Test at three levels

Recommended tests:

- Event formatting helper tests: verifies `id`, `event`, JSON `data`, and blank line terminator.
- Route Handler tests: verifies headers, auth, and abort cleanup where practical.
- Client tests: verifies `EventSource.close()` on unmount and terminal events.

Manual tests:

- Open the page, start stream, navigate away, confirm server cleanup logs.
- Disconnect/reconnect network.
- Open multiple tabs.
- Deploy while a stream is active.
- Let the stream idle long enough to verify heartbeat behavior.

## 3. Vercel-Specific Best Practices

### Know the Function duration limit

An SSE response keeps the function invocation open. Configure `maxDuration` deliberately and design the UI to reconnect before/after limits.

For Next.js App Router on Vercel, configure maximum duration in the route file:

```ts
export const maxDuration = 300;
```

Vercel documentation currently lists Fluid Compute defaults around 300 seconds and plan-specific maximums. Vercel’s June 2026 changelog also says Pro/Enterprise Node.js and Python Functions can opt into 1800 seconds in beta with Fluid Compute. Verify the current limit for the project’s Vercel plan before relying on long streams.

### Prefer Fluid Compute for streaming and AI workloads

Fluid Compute is Vercel’s current serverless/server-like execution model. It supports optimized concurrency and is intended for I/O-heavy workloads such as AI calls and streaming responses.

Implications:

- Long streams are more practical than older serverless defaults.
- Waiting on I/O may be cost-efficient under Active CPU pricing, but provisioned memory and invocation duration still matter.
- Shared process/global memory can serve concurrent requests, so do not store user/job state only in module globals.

### Do not rely on instance memory

Vercel Functions can run concurrently, scale out, pause, recycle, or receive reconnects on a different instance. For realtime features, Vercel’s guidance is to keep shared state in an external store rather than in instance memory.

For SSE:

- Store job status and terminal results in a database.
- Store replayable event history when events matter.
- Treat a live in-memory subscriber list as an optimization only.

### Account for connection closures

Connections can close because of:

- client navigation
- network changes
- browser sleep
- function max duration
- deployment/recycling
- upstream provider failures

Required behavior:

- Client reconnects automatically or offers retry.
- Server supports resume/fetch-current-state.
- Terminal status is available outside the stream.

### Be careful with Edge runtime

Vercel Edge Functions support streaming, but with important limits:

- limited API surface
- lower memory/bundle limits
- must begin returning a response within 25 seconds
- can stream up to 300 seconds

Use Edge for simple, latency-sensitive event fanout close to users. Use Node.js for most app-integrated SSE endpoints that touch databases, auth, AI SDKs, or long server-side work.

### Vercel Functions do not replace WebSocket servers

Vercel’s general limits page says Vercel Functions do not support acting as a WebSocket server. If the product truly needs WebSockets, use Vercel Services where applicable, a third-party realtime provider, or a dedicated realtime backend.

SSE remains a good fit for one-way UI updates without needing WebSocket server support.

### Mind response and resource limits

Vercel Function limits to consider:

- max duration
- memory
- bundle size
- request/response payload size
- file descriptors shared across concurrent executions
- concurrency and cost

SSE-specific implications:

- Do not stream huge artifacts as one response.
- Avoid many upstream open connections per SSE connection.
- Release database cursors/subscriptions on abort.
- Keep dependencies in SSE route handlers light.

### Choose the right durable primitive

For long-running or durable work:

- Use Vercel Queues or another queue to absorb and process work asynchronously.
- Use Vercel Workflows or equivalent durable workflow tooling when work can outlast function duration or needs pause/resume semantics.
- Use SSE only to display progress and state to the active browser session.

## Recommended Architecture Pattern

```text
Client Component
  ├─ starts job through Server Action or POST route
  ├─ receives runId
  ├─ opens EventSource(/api/runs/:runId/events)
  └─ closes EventSource on unmount / terminal state

Next.js Route Handler: GET /api/runs/:runId/events
  ├─ authenticates user
  ├─ verifies run ownership
  ├─ sends connected event
  ├─ streams replay/new events from durable store or pub/sub
  ├─ sends heartbeat comments
  └─ cleans up on request.signal abort

Worker / application use case
  ├─ performs long-running work
  ├─ writes run state/events to durable storage
  └─ marks terminal success/failure
```

## Production Checklist

### Event protocol

- [ ] Named events are documented.
- [ ] Every event payload has a stable schema.
- [ ] Events include sequence IDs when resumability matters.
- [ ] Terminal `complete` and `error` events are explicit.
- [ ] Payloads are small and safe for logs/devtools.

### Server route

- [ ] Route Handler returns `Content-Type: text/event-stream; charset=utf-8`.
- [ ] Route Handler returns `Cache-Control: no-cache, no-transform`.
- [ ] Route is dynamic, not statically cached.
- [ ] Auth and run ownership are checked before streaming private events.
- [ ] Heartbeats are sent for quiet streams.
- [ ] `request.signal` cleanup clears intervals/subscriptions.
- [ ] `maxDuration` is intentionally configured.
- [ ] Route does not mutate important state on `GET` unless idempotent.

### Client

- [ ] `EventSource` is created only in a Client Component/hook.
- [ ] Source is closed on unmount and terminal events.
- [ ] UI handles reconnecting state.
- [ ] UI can fetch current/final state outside SSE.
- [ ] Multiple tabs or duplicate stream openings are acceptable or prevented.

### Vercel deployment

- [ ] Fluid Compute behavior and plan duration limits are verified.
- [ ] Durable state is external, not only in function memory.
- [ ] Long work is in a queue/workflow if it must survive disconnects.
- [ ] Edge vs Node runtime choice is explicit.
- [ ] Logs capture lifecycle without logging private event payloads.

## Sources

- MDN, [Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- MDN, [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- Next.js Docs, [Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- Next.js Learn, [Streaming](https://nextjs.org/learn/dashboard-app/streaming)
- Vercel Docs, [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)
- Vercel Docs, [Configuring Maximum Duration for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/duration)
- Vercel Docs, [Functions API Reference](https://vercel.com/docs/functions/functions-api-reference)
- Vercel Docs, [Edge Functions](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc)
- Vercel Docs, [Fluid Compute](https://vercel.com/docs/fluid-compute)
- Vercel Knowledge Base, [How Vercel Services run on Fluid compute](https://vercel.com/kb/guide/vercel-services-fluid-compute)
- Vercel Changelog, [Vercel Functions can now run up to 30 minutes](https://vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes)
- Vercel Docs, [Vercel Queues](https://vercel.com/docs/queues)
