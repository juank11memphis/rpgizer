# Technical Design: Adventure Creation Progress

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/adventure-creation-progress/feature_brief.md`
- UX spec: `docs/features/adventure-creation-progress/ux.md`
- SSE guidance: `docs/sse-ui-best-practices.md`
- Delegated skills for implementation: `clean-code`, `ddd-hexagonal`, `typescript`, `nextjs`, `react`, `structured-logging`

## Summary

Replace the current request-blocking forge page with a request-bound SSE progress experience at the existing `/adventures/[adventureId]/forge` route. The browser opens one `EventSource` to a Route Handler that authenticates/authorizes the User, runs the existing forge orchestration, emits coarse RPG-facing progress events, and sends terminal success/failure events. This MVP intentionally does not add queues, workers, or durable generation job tables; the UI must tell the User to keep the window open while forging.

## Existing Context

- `src/app/adventures/[adventureId]/interview/ready-to-forge-panel.tsx` already links confirmed Users to `/adventures/${adventureId}/forge` with **Forge My Adventure**.
- `src/app/adventures/[adventureId]/forge/page.tsx` currently calls `generateInterviewOutputArtifact(...)` in a Server Component and renders `ForgeReady` / `ForgeFailure`.
- `src/app/adventures/[adventureId]/forge/actions.ts` has retry behavior that calls `forgeAdventure(...)` and redirects back to `/forge`.
- `src/modules/game-master-assistant/application/forge-adventure/usecase.ts` already orchestrates the full forge: load confirmed interview, get/create Interview Output Artifact, call Adventure Planner, persist generated Adventure, and return ready/failure states.
- `src/modules/adventure-planner/infra/openai-multi-step-adventure-generator.ts` already has the internal generation stages that map to UX stages: content generation, dependency linking, XP balancing, final assembly/validation.
- Generated Adventure persistence is already durable as the final output. Intermediate forge progress is not durable today.
- `docs/sse-ui-best-practices.md` recommends EventSource ownership in a Client Component, a dynamic Node.js Route Handler, heartbeats, terminal events, explicit close-on-complete, safe auth/ownership checks, and no fake progress.

## Deep Module Mapping

- **Game Master Assistant** owns the forge orchestration because it bridges confirmed Interview state into Adventure generation.
- **Adventure Planner** owns generated roadmap content, linking, XP balancing, assembly, and validation stages. It should expose stage progress through a narrow application/port callback rather than leaking provider details to the route.
- **Adventure Experience Presenter** is only the success destination boundary for the future Adventure Detail Page. It does not own this progress page and should not be expanded for this MVP.
- **User Identity** continues to own authentication/current-user resolution and ownership enforcement at entrypoints/use cases.

## Proposed Design

### Route shape

Keep the existing user-facing route:

```txt
/adventures/[adventureId]/forge
```

Change it from a blocking Server Component into a thin route page that authenticates enough to render the shell or redirects unauthenticated Users, then renders a Client Component that owns the `EventSource` connection.

Add an SSE Route Handler under the same segment:

```txt
src/app/adventures/[adventureId]/forge/events/route.ts
```

Route Handler requirements:

- `GET` only.
- `runtime = "nodejs"`.
- `dynamic = "force-dynamic"`.
- Set an intentional `maxDuration` suitable for the expected 30–60s generation window, with margin.
- Return `Content-Type: text/event-stream; charset=utf-8` and `Cache-Control: no-cache, no-transform`.
- Authenticate with `requireCurrentSessionUser()`.
- If unauthenticated, return a non-stream HTTP error; the page-level auth redirect should normally prevent this.
- Call only the Game Master Assistant application/composition boundary, not repositories, database clients, SDKs, or Adventure Planner infrastructure directly.

### Request-bound generation model

This MVP does not introduce durable background execution. Generation runs inside the SSE request after the client opens the stream.

Implications:

- The UI must say: **Keep this window open while your Adventure is forged.**
- If the User closes the tab/window, generation is not guaranteed to continue.
- If generation already completed and persisted the generated Adventure, retry/reopen should reuse the existing result through current idempotent behavior.
- If generation did not complete, the User can retry from the failure/stall state or by reopening the forge page.
- The route should listen to `request.signal` for cleanup and should stop before starting a next stage when aborted when practical.

This keeps MVP scope aligned with the feature brief and leaves a future seam for queues/workflows/job tables.

### SSE event protocol

Define a small protocol in application-facing TypeScript types, not ad hoc strings in UI code.

Recommended event names:

- `connected`
- `progress`
- `complete`
- `error`

Recommended progress stages:

```ts
type ForgeProgressStage =
  | "quest_lore"
  | "adventure_roadmap"
  | "connections"
  | "xp_rewards"
  | "opening_adventure";
```

User-facing labels stay in the UI layer and must match `ux.md`:

- `quest_lore` → **Gathering your quest lore**
- `adventure_roadmap` → **Building your adventure roadmap**
- `connections` → **Connecting quests, skills, and inventory**
- `xp_rewards` → **Balancing XP and rewards**
- `opening_adventure` → **Opening your adventure**

Example payload shape:

```ts
type ForgeSseEnvelope<T> = {
  adventureId: string;
  sequence: number;
  timestamp: string;
  data: T;
};
```

Progress payload:

```ts
type ForgeProgressPayload = {
  stage: ForgeProgressStage;
  status: "started" | "completed";
};
```

Complete payload:

```ts
type ForgeCompletePayload = {
  adventureId: string;
  generatedAdventureId: string;
  destination: string;
};
```

Error payload:

```ts
type ForgeErrorPayload = {
  message: string;
  canRetry: true;
};
```

Do not send raw backend step names, provider errors, prompts, generated content, IDs beyond the safe Adventure/generated Adventure ids needed for routing, logs, stack traces, or detailed diagnostics.

### Application orchestration changes

Extend the existing `forgeAdventure(...)` application use case with an optional progress reporter port/callback. Keep it optional so existing tests and non-stream callers remain simple.

Conceptual shape:

```ts
type ForgeProgressReporter = {
  report(input: {
    stage: ForgeProgressStage;
    status: "started" | "completed";
  }): Promise<void> | void;
};
```

`forgeAdventure(...)` should report:

1. `quest_lore started` before get/create Interview Output Artifact.
2. `quest_lore completed` when the artifact is reused or created.
3. `adventure_roadmap started` before Adventure Planner content generation starts.
4. `adventure_roadmap completed` after content generation completes.
5. `connections started/completed` around dependency linking.
6. `xp_rewards started/completed` around XP balancing.
7. `opening_adventure started` before final assembly/persistence/ready response.
8. `opening_adventure completed` immediately before terminal `complete`.

Because content/linking/XP stages currently live inside `OpenAIMultiStepAdventureGenerator`, add a narrow progress callback to the Adventure Planner generation path rather than duplicating generation in the route.

Recommended boundary:

- Add optional progress reporting to `AdventureGeneratorRequest` or an adjacent application port in `src/modules/adventure-planner/application/generate-adventure/*`.
- `OpenAIMultiStepAdventureGenerator` invokes that callback at stage boundaries.
- The callback vocabulary must use product/application stage names, not OpenAI/provider details.

Avoid route-handler-to-infrastructure progress hooks. The route handler should only pass a reporter into the Game Master Assistant composition/use case.

### SSE Route Handler behavior

The Route Handler should:

1. Create a `ReadableStream`.
2. Send `connected` immediately.
3. Start a heartbeat interval, e.g. `: heartbeat\n\n` every 15–25 seconds.
4. Call `forgeAdventure(...)` with a reporter that enqueues `progress` events.
5. On `ready`, enqueue `complete` with destination `/adventures/${adventureId}` or the actual detail route used by the app.
6. On expected not-found/not-confirmed/recoverable failure, enqueue `error` with a safe message and close.
7. On unexpected failure, log safely, enqueue the same safe failure message when possible, then close.
8. On `request.signal.abort`, clear heartbeat and stop enqueuing. Log client disconnect without logging payloads.

Do not start generation from the page render. The Client Component opening the SSE connection is the start signal for MVP.

### Client progress screen

Implement route-local components under `src/app/adventures/[adventureId]/forge/` following the UX spec.

Suggested component responsibilities:

- `page.tsx`: Server Component auth/redirect and shell composition only.
- `forge-progress-client.tsx`: owns `EventSource`, connection state, terminal state, redirect, and stage state.
- `forge-road-scene.tsx`: presentational Forge Road visual.
- `forge-stage-list.tsx`: presentational stage list.
- `forge-failure-panel.tsx`: presentational recovery state/actions.
- Supporting type/label helpers in non-JSX files where useful.

Client behavior:

- Open exactly one `EventSource` for the current Adventure.
- Close it on unmount and after terminal `complete` or `error`.
- Treat `EventSource.onerror` as a transport/reconnecting state unless a terminal error event has arrived.
- Update stage state only from valid known stage payloads.
- On `complete`, close the source and redirect to the detail destination.
- Show the success toast on the destination by passing a short query flag or other existing app-safe toast mechanism. If no toast system exists yet, use a minimal route-local/client mechanism on the detail page without designing detail content.
- Respect reduced-motion with CSS/media queries and by not relying on motion for state.

The normal progress screen should have no action buttons. Failure/stall state shows **Try again** and **Back to interview** only.

### Retry behavior

Simplify retry around the SSE model:

- **Try again** should restart the SSE generation flow for the same `/forge` page, either by remounting the client connection or using a local retry counter in the `EventSource` URL.
- Preserve the existing application idempotency: if artifact/generated Adventure already exists, the use case reuses it and emits completed stages quickly.
- Existing `retryForgeAction` can be removed or kept only if still used by a non-SSE fallback. Do not keep unused server action/UI paths.

### Stalls and reconnects

MVP does not persist progress events, so true event replay after tab close/reload is out of scope.

Handle practical cases:

- If the network blips but the same request continues, EventSource may reconnect and start a new forge stream; idempotency should prevent duplicate final Adventures.
- UI should show calm reconnecting copy such as **Still forging…** while transport reconnects.
- Add a client-side stall threshold only for UX recovery, not as proof the backend failed. If no progress arrives for the agreed threshold, show the failure/stall state with **Try again** and **Back to interview**.
- Keep server heartbeats from updating visible progress.

### Persistence and database

No new job table or progress-event table for MVP.

Existing persistence remains the source of truth for final outputs:

- `interviewOutputArtifacts` stores the generated Interview Output Artifact.
- generated Adventure tables store the final Adventure and mark `adventures.state = 'generated'`.

No migration is required unless implementation discovers the detail route/toast needs a durable notification mechanism, which should be avoided for this MVP.

### Logging and observability

Add or reuse structured log events for meaningful lifecycle points:

- SSE stream opened.
- SSE stream completed.
- SSE stream client-disconnected/aborted.
- SSE stream expected error.
- SSE stream unexpected error.
- Optional progress stage emitted, without payload details beyond safe stage name/status.

Keep existing forge/adventure-generation logs. Do not log prompts, full generated Adventure content, interview transcript text, raw provider payloads, or SSE data payloads.

### Security and authorization

- Page and SSE route must require an authenticated User.
- The application use case must continue to enforce User ownership by loading the draft/generated Adventure through user-scoped repository methods.
- Do not expose whether another User's Adventure exists. Unauthorized/not-found should resolve to not-found/login behavior or a safe terminal error.
- Avoid sensitive query strings. The `adventureId` is already in the route; retry counters or toast flags should not include sensitive data.

## Validation

Automated checks:

- Unit tests for SSE event formatting helper: `id`, `event`, JSON `data`, blank-line terminator, heartbeat formatting.
- Application tests for `forgeAdventure(...)` progress reporter order in success, artifact reuse, generated Adventure reuse, recoverable failure, and not-confirmed paths.
- Adventure Planner tests that multi-step generator emits content/linking/XP progress without leaking OpenAI/provider details.
- Route Handler tests for headers, auth behavior, terminal success/error events, and abort cleanup where practical.
- Client tests for `EventSource.close()` on unmount, complete, and error; valid stage updates; reconnecting state; failure actions; and reduced-motion-safe text states.
- Existing forge/adventure-planner tests should continue to pass.

Manual checks:

- Complete an Interview, click **Forge My Adventure**, and see the Forge Road stages advance.
- Close/navigate away during generation and verify server cleanup logs and no UI promise that generation continues.
- Retry after a failure/stall.
- Reopen `/forge` after a generated Adventure already exists and verify quick completion/reuse.
- Confirm success redirect lands on the Adventure Detail Page and shows **Adventure forged.**
- Verify no raw backend labels, provider errors, prompts, or generated payloads appear in the UI or logs.
- Verify reduced-motion mode freezes decorative motion while preserving text/checkmark progress.

## Risks / Tradeoffs

- Request-bound generation is simpler but cannot guarantee completion after browser close or platform abort. The UI copy must explicitly ask the User to keep the window open.
- Event replay is intentionally limited because progress events are not persisted. Existing idempotent final-output persistence is the recovery mechanism.
- Network reconnects may start another request-bound forge stream; repository uniqueness/idempotency must continue to protect against duplicate final Adventures.
- SSE route duration must stay within Vercel function limits; if generation grows beyond the current 30–60s expectation, this should be revisited with a durable queue/workflow design.
- The Forge Road visual may require careful component splitting to avoid one oversized Client Component.
