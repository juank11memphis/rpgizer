import type { ForgeAdventureOutput } from "@/modules/game-master-assistant/application/forge-adventure/output";
import type { ForgeProgressReporter } from "@/modules/game-master-assistant/application/forge-adventure/progress";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";
import { serverLogger } from "@/server/logging/logger";
import { serializeErrorForLog } from "@/server/logging/redaction";

import {
  FORGE_SSE_EVENT_NAMES,
  createForgeSseEnvelope,
  formatForgeSseEvent,
  formatForgeSseHeartbeat,
  type ForgeCompletePayload,
  type ForgeConnectedPayload,
  type ForgeErrorPayload,
  type ForgeProgressPayload,
  type ForgeSseEventName,
} from "./forge-sse";

export const FORGE_SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const DEFAULT_HEARTBEAT_INTERVAL_MS = 20_000;
const SAFE_FORGE_ERROR_MESSAGE = "Your interview is safe. Try again when you’re ready.";

export type ForgeSseRouteRequest = Readonly<{
  request: Request;
  adventureId: string;
}>;

export type ForgeSseRouteDependencies = Readonly<{
  requireCurrentUser: () => Promise<RequireCurrentUserResult>;
  forgeAdventure: (input: {
    userId: string;
    adventureId: string;
    progressReporter: ForgeProgressReporter;
  }) => Promise<ForgeAdventureOutput>;
  logger?: ForgeSseLogger;
  heartbeatIntervalMs?: number;
  now?: () => Date;
  timers?: ForgeSseTimers;
}>;

type ForgeSseLogger = Pick<typeof serverLogger, "info" | "warn" | "error">;

type ForgeSseTimers = Readonly<{
  setInterval(callback: () => void, intervalMs: number): unknown;
  clearInterval(timer: unknown): void;
}>;

type StreamLifecycle = Readonly<{
  sendEvent<TData>(event: ForgeSseEventName, data: TData): boolean;
  sendHeartbeat(): boolean;
  complete(): void;
  failExpected(resultCategory: ExpectedForgeFailureStatus): void;
  failUnexpected(error: unknown): void;
  abort(): void;
}>;

type ExpectedForgeFailureStatus = Exclude<ForgeAdventureOutput["status"], "ready">;

type TerminalState = "open" | "completed" | "expected_error" | "unexpected_error" | "aborted";

export async function createForgeSseResponse(
  input: ForgeSseRouteRequest,
  dependencies: ForgeSseRouteDependencies,
): Promise<Response> {
  const currentUser = await dependencies.requireCurrentUser();

  if (currentUser.status === "unauthenticated") {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      startForgeStream({
        controller,
        request: input.request,
        adventureId: input.adventureId,
        userId: currentUser.user.id,
        dependencies,
      });
    },
  });

  return new Response(stream, { headers: FORGE_SSE_HEADERS });
}

function startForgeStream(input: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  request: Request;
  adventureId: string;
  userId: string;
  dependencies: ForgeSseRouteDependencies;
}): void {
  const logger = input.dependencies.logger ?? serverLogger;
  const timers = input.dependencies.timers ?? globalThis;
  const now = input.dependencies.now ?? (() => new Date());
  const startedAt = now();
  const encoder = new TextEncoder();
  let sequence = 0;
  let terminalState: TerminalState = "open";
  let heartbeatTimer: unknown;

  const lifecycle: StreamLifecycle = {
    sendEvent<TData>(event: ForgeSseEventName, data: TData): boolean {
      if (terminalState !== "open" || input.request.signal.aborted) {
        return false;
      }

      sequence += 1;
      const envelope = createForgeSseEnvelope({
        adventureId: input.adventureId,
        sequence,
        timestamp: now().toISOString(),
        data,
      });

      return enqueueFrame(input.controller, encoder, formatForgeSseEvent(event, envelope, { id: sequence }));
    },
    sendHeartbeat(): boolean {
      if (terminalState !== "open" || input.request.signal.aborted) {
        return false;
      }

      return enqueueFrame(input.controller, encoder, formatForgeSseHeartbeat());
    },
    complete(): void {
      if (terminalState !== "open") return;
      terminalState = "completed";
      cleanup();
      logger.info(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_COMPLETED,
          flow: "forge",
          operation: "forge_sse_stream",
          result: "success",
          userId: input.userId,
          adventureId: input.adventureId,
          durationMs: durationMs(startedAt, now()),
          eventCount: sequence,
        },
        "Forge SSE stream completed.",
      );
      closeController(input.controller);
    },
    failExpected(resultCategory: ExpectedForgeFailureStatus): void {
      if (terminalState !== "open") return;
      terminalState = "expected_error";
      cleanup();
      logger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_EXPECTED_ERROR,
          flow: "forge",
          operation: "forge_sse_stream",
          result: "expected_error",
          userId: input.userId,
          adventureId: input.adventureId,
          resultCategory,
          durationMs: durationMs(startedAt, now()),
          eventCount: sequence,
        },
        "Forge SSE stream ended with an expected error.",
      );
      closeController(input.controller);
    },
    failUnexpected(error: unknown): void {
      if (terminalState !== "open") return;
      terminalState = "unexpected_error";
      cleanup();
      logger.error(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_UNEXPECTED_ERROR,
          flow: "forge",
          operation: "forge_sse_stream",
          result: "failure",
          userId: input.userId,
          adventureId: input.adventureId,
          durationMs: durationMs(startedAt, now()),
          eventCount: sequence,
          error: serializeErrorForLog(error),
        },
        "Forge SSE stream failed unexpectedly.",
      );
      closeController(input.controller);
    },
    abort(): void {
      if (terminalState !== "open") return;
      terminalState = "aborted";
      cleanup();
      logger.warn(
        {
          event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_CLIENT_DISCONNECTED,
          flow: "forge",
          operation: "forge_sse_stream",
          result: "client_disconnected",
          userId: input.userId,
          adventureId: input.adventureId,
          durationMs: durationMs(startedAt, now()),
          eventCount: sequence,
        },
        "Forge SSE stream client disconnected.",
      );
      closeController(input.controller);
    },
  };

  const cleanup = () => {
    if (heartbeatTimer !== undefined) {
      timers.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    }
    input.request.signal.removeEventListener("abort", lifecycle.abort);
  };

  input.request.signal.addEventListener("abort", lifecycle.abort, { once: true });

  if (input.request.signal.aborted) {
    lifecycle.abort();
    return;
  }

  lifecycle.sendEvent<ForgeConnectedPayload>(FORGE_SSE_EVENT_NAMES.connected, {
    status: "connected",
  });

  logger.info(
    {
      event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_OPENED,
      flow: "forge",
      operation: "forge_sse_stream",
      result: "started",
      userId: input.userId,
      adventureId: input.adventureId,
    },
    "Forge SSE stream opened.",
  );

  heartbeatTimer = timers.setInterval(() => {
    lifecycle.sendHeartbeat();
  }, input.dependencies.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS);

  void runForgeAdventure({
    adventureId: input.adventureId,
    userId: input.userId,
    forgeAdventure: input.dependencies.forgeAdventure,
    lifecycle,
  });
}

async function runForgeAdventure(input: {
  adventureId: string;
  userId: string;
  forgeAdventure: ForgeSseRouteDependencies["forgeAdventure"];
  lifecycle: StreamLifecycle;
}): Promise<void> {
  try {
    const result = await input.forgeAdventure({
      userId: input.userId,
      adventureId: input.adventureId,
      progressReporter: {
        report(event: ForgeProgressPayload) {
          input.lifecycle.sendEvent(FORGE_SSE_EVENT_NAMES.progress, event);
        },
      },
    });

    if (result.status !== "ready") {
      input.lifecycle.sendEvent<ForgeErrorPayload>(FORGE_SSE_EVENT_NAMES.error, {
        message: SAFE_FORGE_ERROR_MESSAGE,
        canRetry: true,
      });
      input.lifecycle.failExpected(result.status);
      return;
    }

    input.lifecycle.sendEvent<ForgeCompletePayload>(FORGE_SSE_EVENT_NAMES.complete, {
      adventureId: input.adventureId,
      generatedAdventureId: result.generatedAdventureId,
      destination: `/adventures/${input.adventureId}`,
    });
    input.lifecycle.complete();
  } catch (error) {
    input.lifecycle.sendEvent<ForgeErrorPayload>(FORGE_SSE_EVENT_NAMES.error, {
      message: SAFE_FORGE_ERROR_MESSAGE,
      canRetry: true,
    });
    input.lifecycle.failUnexpected(error);
  }
}

function enqueueFrame(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  frame: string,
): boolean {
  try {
    controller.enqueue(encoder.encode(frame));
    return true;
  } catch {
    return false;
  }
}

function closeController(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close();
  } catch {
    // The stream may already be closed by the runtime after a client abort.
  }
}

function durationMs(startedAt: Date, finishedAt: Date): number {
  return Math.max(0, finishedAt.getTime() - startedAt.getTime());
}
