import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import { validInterviewOutputArtifact } from "../../game-master-assistant/application/test/fake-interview-output-artifact-generator";
import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { buildGeneratedAdventureBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { OpenAIAdventureGenerator } from "./openai-adventure-generator";

type CreateResponseMock = Mock<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>;

type MockOpenAIClient = {
  responses: {
    create: CreateResponseMock;
  };
};

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../server/logging/logger", () => ({
  serverLogger: {
    debug: loggerMock.debug,
    error: loggerMock.error,
    info: loggerMock.info,
    warn: loggerMock.warn,
  },
}));

const validPayload = buildGeneratedAdventureBoundaryPayload();

describe("OpenAIAdventureGenerator", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("calls OpenAI Responses with strict structured output and returns parsed Adventure content", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validPayload)));
    const generator = createGenerator(client);

    const result = await generator.generateAdventure(baseRequest());

    expect(result.title).toBe(validPayload.title);
    expect(result.acts[0]).toMatchObject({ sequenceNumber: 1 });
    expect(result.skills[0]).toMatchObject({ xp: 0, level: 1 });
    expect(result.inventoryItems[0]).toMatchObject({ status: "needed", acquiredAt: null });
    expect(result.achievements[0]).toMatchObject({ status: "locked", unlockedAt: null });
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        instructions: "Generate adventure prompt",
        max_output_tokens: 6000,
        store: false,
        safety_identifier: "user-1",
      }),
    );

    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_generated_adventure",
      strict: true,
      schema: expect.objectContaining({ additionalProperties: false }),
    });
    expect(request?.input).toEqual([
      {
        role: "user",
        content: JSON.stringify({
          adventureId: "adventure-1",
          goalText: "Become a chef",
          interviewOutputArtifactId: "artifact-1",
          interviewOutputArtifact: validInterviewOutputArtifact(),
        }),
      },
      { role: "user", content: "Become a chef" },
      { role: "assistant", content: "What is your current cooking level?" },
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_STARTED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        artifactId: "artifact-1",
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_COMPLETED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        result: "success",
        model: "gpt-5.5",
        actCount: 1,
        questCount: 2,
        bossFightCount: 1,
        skillCount: 2,
        inventoryItemCount: 2,
        achievementCount: 1,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG)).toEqual([]);
    expect(serializedLogPayloads()).not.toContain("Generate adventure prompt");
    expect(serializedLogPayloads()).not.toContain("Become a chef");
  });

  it("rejects missing required Adventure fields as invalid provider output", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify({ title: "Too little" })));

    await expect(createGenerator(client).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_OUTPUT_INVALID)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        providerErrorCode: "provider_output_invalid",
        providerErrorCategory: "invalid_output",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
    ]);
  });

  it("rejects schema-shaped output with invalid skill and inventory references", async () => {
    const badReferences = buildGeneratedAdventureBoundaryPayload({
      acts: [
        {
          ...validPayload.acts[0],
          mainQuests: [
            {
              ...validPayload.acts[0].mainQuests[0],
              skillRewards: [{ skillKey: "unknown-skill", xp: 25 }],
            },
          ],
          bossFights: [
            {
              ...validPayload.acts[0].bossFights[0],
              inventoryItemKeys: ["unknown-item"],
            },
          ],
        },
      ],
    });
    const client = createMockClient(responseWithOutput(JSON.stringify(badReferences)));

    await expect(createGenerator(client).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("normalizes provider request failures", async () => {
    const client = createMockClient(Promise.reject(new Error("raw provider failure")));

    await expect(createGenerator(client).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI Adventure generation request failed.",
    });
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_PROVIDER_FAILED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        providerErrorCategory: "request_failed",
        error: expect.objectContaining({ name: "Error", message: "Provider request failed." }),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("sk-test");
  });

  it("rejects refused, incomplete, blank, and non-JSON output", async () => {
    const refusedClient = createMockClient({
      ...responseWithOutput(""),
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "I cannot help with that." }],
        },
      ],
    } as Response);
    const incompleteClient = createMockClient({
      ...responseWithOutput(JSON.stringify(validPayload)),
      status: "incomplete",
    } as Response);
    const blankClient = createMockClient(responseWithOutput("   "));
    const malformedClient = createMockClient(responseWithOutput("not-json"));

    await expect(createGenerator(refusedClient).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(incompleteClient).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(blankClient).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(malformedClient).generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("emits redacted and truncated payload debug logs only when enabled", async () => {
    process.env.AI_PAYLOAD_LOGGING_ENABLED = "1";
    process.env.AI_PAYLOAD_LOG_MAX_CHARS = "6";
    const client = createMockClient({
      ...responseWithOutput(JSON.stringify(validPayload)),
      authorization: "Bearer secret-token",
    } as unknown as Response);

    await createGenerator(client).generateAdventure(baseRequest());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "request",
      }),
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ authorization: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("Bearer secret-token");
    expect(serializedLogPayloads()).not.toContain("Generate adventure prompt");
  });

  it("keeps the default prompt as a compact Adventure design spec", async () => {
    const prompt = await readFile(
      path.join(process.cwd(), "src/modules/adventure-planner/infra/prompts/generate-adventure.md"),
      "utf8",
    );

    expect(prompt).toContain("Adventure: a playable RPG-native plan for a real-life goal");
    expect(prompt).toContain("Act: a meaningful phase/chapter");
    expect(prompt).toContain("Main Quest: required critical-path action");
    expect(prompt).toContain("Side Quest: optional but meaningful");
    expect(prompt).toContain("Boss Fight: first-class milestone challenge");
    expect(prompt).toContain("Skill: a real capability");
    expect(prompt).toContain("Inventory Item: practical readiness item");
    expect(prompt).toContain("Achievement: meaningful future recognition");
    expect(prompt).toContain("reward/XP intent");
    expect(prompt).toContain("focusedNextActions");
    expect(prompt).toContain("Generic todo list with fantasy labels");
    expect(prompt).toContain("RPG flavor that hides actionability");
    expect(prompt).toContain("Do not imply RPGizer replaces expert advice");
    expect(prompt).toContain("title, themeSummary, goalSummary, safetyNotes, acts, skills, inventoryItems, achievements, focusedNextActions");
  });

  it("surfaces missing configuration as a stable configuration error", () => {
    expect(() => new OpenAIAdventureGenerator()).toThrow(AdventureGeneratorError);
  });
});

function createGenerator(client: MockOpenAIClient): OpenAIAdventureGenerator {
  return new OpenAIAdventureGenerator({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5" },
    instructions: "Generate adventure prompt",
  });
}

function createMockClient(response: Response | Promise<Response>): MockOpenAIClient {
  return {
    responses: {
      create: vi.fn<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>().mockReturnValue(
        response instanceof Promise ? response : Promise.resolve(response),
      ),
    },
  };
}

function responseWithOutput(outputText: string): Response {
  return {
    status: "completed",
    output_text: outputText,
    output: [],
  } as unknown as Response;
}

function infoPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.info.mock.calls
    .map(([payload]) => payload)
    .filter(isPayloadFor(event));
}

function warnPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.warn.mock.calls
    .map(([payload]) => payload)
    .filter(isPayloadFor(event));
}

function errorPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.error.mock.calls
    .map(([payload]) => payload)
    .filter(isPayloadFor(event));
}

function debugPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.debug.mock.calls
    .map(([payload]) => payload)
    .filter(isPayloadFor(event));
}

function isPayloadFor(event: string) {
  return (payload: unknown): payload is Record<string, unknown> =>
    typeof payload === "object" &&
    payload !== null &&
    "event" in payload &&
    payload.event === event;
}

function serializedLogPayloads(): string {
  return JSON.stringify([
    ...loggerMock.debug.mock.calls.map(([payload]) => payload),
    ...loggerMock.error.mock.calls.map(([payload]) => payload),
    ...loggerMock.info.mock.calls.map(([payload]) => payload),
    ...loggerMock.warn.mock.calls.map(([payload]) => payload),
  ]);
}

function baseRequest(): AdventureGeneratorRequest {
  return {
    userId: "user-1",
    adventureId: "adventure-1",
    goalText: "Become a chef",
    interviewOutputArtifactId: "artifact-1",
    interviewOutputArtifact: validInterviewOutputArtifact(),
    transcript: [
      {
        id: "message-1",
        role: "user",
        content: "Become a chef",
        sequenceNumber: 1,
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      },
      {
        id: "message-2",
        role: "game_master",
        content: "What is your current cooking level?",
        sequenceNumber: 2,
        createdAt: new Date("2026-01-01T00:00:02.000Z"),
      },
    ],
  };
}
