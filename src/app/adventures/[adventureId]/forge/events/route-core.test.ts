import { describe, expect, it, vi } from "vitest";

import type { ForgeAdventureOutput } from "@/modules/game-master-assistant/application/forge-adventure/output";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";

import { createForgeSseResponse, type ForgeSseRouteDependencies } from "./route-core";

const readyOutput: ForgeAdventureOutput = {
  status: "ready",
  adventureId: "adventure-1",
  artifactId: "artifact-1",
  generatedAdventureId: "generated-adventure-1",
  reusedExistingArtifact: false,
  reusedExistingAdventure: false,
};

describe("createForgeSseResponse", () => {
  it("returns a non-stream HTTP error for unauthenticated requests", async () => {
    const forgeAdventure = vi.fn();

    const response = await createForgeSseResponse(
      createRequestInput(),
      createDependencies({
        requireCurrentUser: async () => ({ status: "unauthenticated" }),
        forgeAdventure,
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(forgeAdventure).not.toHaveBeenCalled();
  });

  it("emits connected before forge work and serializes progress callbacks", async () => {
    const callOrder: string[] = [];
    const response = await createForgeSseResponse(
      createRequestInput(),
      createDependencies({
        forgeAdventure: async ({ progressReporter }) => {
          callOrder.push("forge-started");
          await progressReporter.report({ stage: "quest_lore", status: "started" });
          return readyOutput;
        },
      }),
    );

    const text = await response.text();

    expect(callOrder).toEqual(["forge-started"]);
    expect(text.indexOf("event: connected")).toBeLessThan(text.indexOf("event: progress"));
    expect(text).toContain('"data":{"stage":"quest_lore","status":"started"}');
  });

  it("emits exactly one terminal complete event with a safe destination", async () => {
    const response = await createForgeSseResponse(
      createRequestInput(),
      createDependencies(),
    );

    const text = await response.text();

    expect(countNamedEvents(text, "complete")).toBe(1);
    expect(text).toContain('"destination":"/adventures/adventure-1"');
    expect(text).toContain('"generatedAdventureId":"generated-adventure-1"');
  });

  it("emits exactly one safe terminal error for expected forge failures", async () => {
    const logger = createLogger();
    const response = await createForgeSseResponse(
      createRequestInput(),
      createDependencies({
        logger,
        forgeAdventure: async () => ({ status: "not_found" }),
      }),
    );

    const text = await response.text();

    expect(countNamedEvents(text, "error")).toBe(1);
    expect(text).toContain("Your interview is safe. Try again when you’re ready.");
    expect(text).not.toContain("not_found");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_EXPECTED_ERROR,
        resultCategory: "not_found",
        userId: "user-1",
        adventureId: "adventure-1",
      }),
      expect.any(String),
    );
  });

  it("logs unexpected failures safely, emits one terminal error, and closes", async () => {
    const logger = createLogger();
    const response = await createForgeSseResponse(
      createRequestInput(),
      createDependencies({
        logger,
        forgeAdventure: async () => {
          throw new Error("Provider failed");
        },
      }),
    );

    const text = await response.text();

    expect(countNamedEvents(text, "error")).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_UNEXPECTED_ERROR,
        error: { name: "Error", message: "Provider failed" },
      }),
      expect.any(String),
    );
  });

  it("sends quiet heartbeats as comments and clears heartbeat resources on abort", async () => {
    const abortController = new AbortController();
    const logger = createLogger();
    const timers = createManualTimers();
    const response = await createForgeSseResponse(
      createRequestInput(abortController.signal),
      createDependencies({
        logger,
        timers,
        forgeAdventure: () => new Promise<ForgeAdventureOutput>(() => undefined),
      }),
    );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Expected response body.");

    const connectedChunk = await readTextChunk(reader);
    timers.fireInterval();
    const heartbeatChunk = await readTextChunk(reader);
    abortController.abort();
    await reader.read();

    expect(connectedChunk).toContain("event: connected");
    expect(heartbeatChunk).toBe(": heartbeat\n\n");
    expect(timers.clearCalls).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_CLIENT_DISCONNECTED,
        result: "client_disconnected",
      }),
      expect.any(String),
    );
  });
});

function createRequestInput(signal?: AbortSignal) {
  return {
    request: new Request("http://localhost/adventures/adventure-1/forge/events", { signal }),
    adventureId: "adventure-1",
  };
}

function createDependencies(
  overrides: Partial<ForgeSseRouteDependencies> = {},
): ForgeSseRouteDependencies {
  return {
    requireCurrentUser: async (): Promise<RequireCurrentUserResult> => ({
      status: "authenticated",
      user: { id: "user-1", name: null, email: null, image: null },
    }),
    forgeAdventure: async ({ progressReporter }) => {
      await progressReporter.report({ stage: "quest_lore", status: "started" });
      return readyOutput;
    },
    logger: createLogger(),
    now: () => new Date("2026-07-24T00:00:00.000Z"),
    heartbeatIntervalMs: 1_000,
    ...overrides,
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createManualTimers() {
  let intervalCallback: (() => void) | null = null;
  return {
    clearCalls: 0,
    setInterval(callback: () => void) {
      intervalCallback = callback;
      return "timer";
    },
    clearInterval() {
      this.clearCalls += 1;
    },
    fireInterval() {
      if (!intervalCallback) throw new Error("Expected interval callback.");
      intervalCallback();
    },
  };
}

async function readTextChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const result = await reader.read();
  if (result.done) return "";
  return new TextDecoder().decode(result.value);
}

function countNamedEvents(text: string, eventName: string): number {
  return text.split(`event: ${eventName}`).length - 1;
}
