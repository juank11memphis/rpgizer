import { readFile } from "node:fs/promises";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ForgeAdventureOutput } from "@/modules/game-master-assistant/application/forge-adventure/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";

const mocks = vi.hoisted(() => ({
  requireCurrentSessionUser: vi.fn(),
  forgeAdventure: vi.fn(),
  createGameMasterAssistantComposition: vi.fn(),
  serverLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/modules/user-identity/infra/auth/session", () => ({
  requireCurrentSessionUser: mocks.requireCurrentSessionUser,
}));

vi.mock("@/modules/game-master-assistant/infra/game-master-assistant-composition", () => ({
  createGameMasterAssistantComposition: mocks.createGameMasterAssistantComposition,
}));

vi.mock("@/server/logging/logger", () => ({
  serverLogger: mocks.serverLogger,
}));

const readyOutput: ForgeAdventureOutput = {
  status: "ready",
  adventureId: "adventure-1",
  artifactId: "artifact-1",
  generatedAdventureId: "generated-adventure-1",
  reusedExistingArtifact: false,
  reusedExistingAdventure: false,
};

describe("forge events route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentSessionUser.mockResolvedValue({
      status: "authenticated",
      user: { id: "user-1", name: null, email: null, image: null },
    });
    mocks.forgeAdventure.mockResolvedValue(readyOutput);
    mocks.createGameMasterAssistantComposition.mockReturnValue({
      forgeAdventure: mocks.forgeAdventure,
    });
  });

  it("uses a dynamic Node.js route handler with an intentional max duration", async () => {
    const route = await import("./route");

    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
    expect(route.maxDuration).toBe(120);
  });

  it("returns a non-stream auth error without creating the composition", async () => {
    mocks.requireCurrentSessionUser.mockResolvedValue({ status: "unauthenticated" });
    const { GET } = await import("./route");

    const response = await GET(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(mocks.createGameMasterAssistantComposition).not.toHaveBeenCalled();
    expect(mocks.forgeAdventure).not.toHaveBeenCalled();
  });

  it("returns SSE headers and streams terminal success through the public GET handler", async () => {
    mocks.forgeAdventure.mockImplementation(async ({ progressReporter }) => {
      await progressReporter.report({ stage: "quest_lore", status: "started" });
      return readyOutput;
    });
    const { GET } = await import("./route");

    const response = await GET(createRequest(), createContext());
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(text).toContain("event: connected");
    expect(text).toContain("event: progress");
    expect(text).toContain("event: complete");
    expect(text).toContain('"destination":"/adventures/adventure-1"');
    expect(mocks.forgeAdventure).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        adventureId: "adventure-1",
        progressReporter: expect.any(Object),
      }),
    );
  });

  it("streams a safe terminal error for expected forge results", async () => {
    mocks.forgeAdventure.mockResolvedValue({ status: "not_confirmed", message: "Confirm first." });
    const { GET } = await import("./route");

    const response = await GET(createRequest(), createContext());
    const text = await response.text();

    expect(text).toContain("event: error");
    expect(text).toContain("Your interview is safe. Try again when you’re ready.");
    expect(text).not.toContain("Confirm first.");
  });

  it("logs client disconnect and closes the stream on abort through GET", async () => {
    const abortController = new AbortController();
    mocks.forgeAdventure.mockReturnValue(new Promise<ForgeAdventureOutput>(() => undefined));
    const { GET } = await import("./route");

    const response = await GET(createRequest(abortController.signal), createContext());
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Expected response body.");

    const connected = await readTextChunk(reader);
    abortController.abort();
    const done = await reader.read();

    expect(connected).toContain("event: connected");
    expect(done.done).toBe(true);
    expect(mocks.serverLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_CLIENT_DISCONNECTED,
        userId: "user-1",
        adventureId: "adventure-1",
      }),
      expect.any(String),
    );
  });

  it("keeps the route and core inside allowed boundary imports", async () => {
    const importLines = await readImportLines([
      "src/app/adventures/[adventureId]/forge/events/route.ts",
      "src/app/adventures/[adventureId]/forge/events/route-core.ts",
    ]);

    expect(importLines).not.toMatch(/repository|db|openai|adventure-planner/i);
    expect(importLines).not.toMatch(/generateAdventure|OpenAIMultiStepAdventureGenerator/);
    expect(importLines).toContain("game-master-assistant");
  });
});

function createRequest(signal?: AbortSignal): Request {
  return new Request("http://localhost/adventures/adventure-1/forge/events", { signal });
}

function createContext() {
  return {
    params: Promise.resolve({ adventureId: "adventure-1" }),
  };
}

async function readTextChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const result = await reader.read();
  if (result.done) return "";
  return new TextDecoder().decode(result.value);
}

async function readImportLines(paths: string[]): Promise<string> {
  const contents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  return contents
    .flatMap((content) => content.split("\n"))
    .filter((line) => line.startsWith("import "))
    .join("\n");
}
