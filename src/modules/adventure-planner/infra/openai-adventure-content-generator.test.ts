import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import { validInterviewOutputArtifact } from "../../game-master-assistant/application/test/fake-interview-output-artifact-generator";
import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { buildGeneratedAdventureContentBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { OpenAIAdventureContentGenerator } from "./openai-adventure-content-generator";

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

const validPayload = buildGeneratedAdventureContentBoundaryPayload();

describe("OpenAIAdventureContentGenerator", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("calls OpenAI Responses with strict unlinked content schema and returns parsed content", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validPayload)));
    const generator = createGenerator(client);

    const result = await generator.generateAdventureContent(baseRequest());

    expect(result.title).toBe(validPayload.title);
    expect(result.acts[0]).toMatchObject({ sequenceNumber: 1 });
    expect(result.acts[0].mainQuests[0]).not.toHaveProperty("skillRewards");
    expect(result.acts[0].mainQuests[0]).not.toHaveProperty("inventoryItemKeys");
    expect(result.skills[0]).toMatchObject({ xp: 0, level: 1 });
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5-content",
        instructions: "Generate unlinked adventure content prompt",
        max_output_tokens: 6000,
        store: false,
        safety_identifier: "user-1",
      }),
    );

    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_generated_adventure_content",
      strict: true,
      schema: expect.objectContaining({ additionalProperties: false }),
    });
    const schemaText = JSON.stringify(request?.text?.format);
    expect(schemaText).toContain("Full verifiable evidence sentence");
    expect(schemaText).toContain("Verb-based real-world capability");
    expect(schemaText).toContain("practical readiness item");
    expect(schemaText).not.toContain("skillRewards");
    expect(schemaText).not.toContain("inventoryItemKeys");
    expect(schemaText.toLowerCase()).not.toContain("xp");
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
  });

  it("emits safe started and completed logs with content counts", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validPayload)));

    await createGenerator(client).generateAdventureContent(baseRequest());

    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_STARTED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        artifactId: "artifact-1",
        model: "gpt-5.5-content",
        step: "content_generation",
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_COMPLETED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        result: "success",
        model: "gpt-5.5-content",
        step: "content_generation",
        actCount: 1,
        questCount: 2,
        bossFightCount: 1,
        skillCount: 2,
        inventoryItemCount: 2,
        achievementCount: 1,
        focusedNextActionCount: 1,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Generate unlinked adventure content prompt");
    expect(serializedLogPayloads()).not.toContain("Become a chef");
  });

  it("rejects dependency links and XP as invalid unlinked content", async () => {
    const linkedPayload = {
      ...validPayload,
      acts: [
        {
          ...validPayload.acts[0],
          mainQuests: [
            {
              ...validPayload.acts[0].mainQuests[0],
              skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
              inventoryItemKeys: ["weekly-menu-template"],
            },
          ],
        },
      ],
    };
    const client = createMockClient(responseWithOutput(JSON.stringify(linkedPayload)));

    await expect(createGenerator(client).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_INVALID)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        providerErrorCode: "provider_output_invalid",
        providerErrorCategory: "invalid_output",
        step: "content_generation",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
    ]);
  });

  it("normalizes provider request failures", async () => {
    const client = createMockClient(Promise.reject(new Error("raw provider failure")));

    await expect(createGenerator(client).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI Adventure content generation request failed.",
    });
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_CONTENT_FAILED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        providerErrorCategory: "request_failed",
        step: "content_generation",
        error: expect.objectContaining({ name: "AdventureGeneratorError", message: "Provider request failed." }),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("sk-test");
  });

  it("rejects refused, incomplete, blank, malformed, and domain-invalid output", async () => {
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
    const domainInvalidClient = createMockClient(
      responseWithOutput(JSON.stringify({ ...validPayload, title: " " })),
    );

    await expect(createGenerator(refusedClient).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(incompleteClient).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(blankClient).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(malformedClient).generateAdventureContent(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(domainInvalidClient).generateAdventureContent(baseRequest())).rejects.toMatchObject({
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

    await createGenerator(client).generateAdventureContent(baseRequest());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        userId: "user-1",
        adventureId: "adventure-1",
        step: "content_generation",
        direction: "request",
      }),
      expect.objectContaining({
        flow: "ai_provider",
        operation: "generate_adventure_content",
        userId: "user-1",
        adventureId: "adventure-1",
        step: "content_generation",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ authorization: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("Bearer secret-token");
    expect(serializedLogPayloads()).not.toContain("Generate unlinked adventure content prompt");
    expect(serializedLogPayloads()).not.toContain(JSON.stringify(validPayload));
  });

  it("loads the default content prompt with quality, safety, and no-link constraints", async () => {
    const prompt = await readFile(
      path.join(process.cwd(), "src/modules/adventure-planner/infra/prompts/generate-adventure-content.md"),
      "utf8",
    );

    expect(prompt).toContain("Adventure Content Designer");
    expect(prompt).toContain("RPG-native plan");
    expect(prompt).toContain("doneCondition is one observable proof sentence");
    expect(prompt).toContain("focusedNextActions");
    expect(prompt).toContain("must not contain skillRewards, inventoryItemKeys");
    expect(prompt).toContain("later steps will link Skills, Inventory Items, and XP");
    expect(prompt).toContain("Do not assume external people/resources exist unless the interview explicitly says they do");
    expect(prompt).toContain("Examples include, but are not limited to");
    expect(prompt).toContain("Inventory names must make the concrete artifact/tool/routine form obvious");
    expect(prompt).toContain("Do not make people or groups Inventory Items");
    expect(prompt).toContain("Do not imply RPGizer replaces expert advice");
  });

  it("surfaces missing configuration as a stable configuration error", () => {
    const oldApiKey = process.env.OPENAI_API_KEY;
    const oldAdventureModel = process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    const oldContentModel = process.env.OPENAI_ADVENTURE_CONTENT_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    delete process.env.OPENAI_ADVENTURE_CONTENT_MODEL;

    try {
      expect(() => new OpenAIAdventureContentGenerator()).toThrow(AdventureGeneratorError);
      expect(() => new OpenAIAdventureContentGenerator()).toThrow("OPENAI_API_KEY is required");
    } finally {
      process.env.OPENAI_API_KEY = oldApiKey;
      process.env.OPENAI_ADVENTURE_GENERATION_MODEL = oldAdventureModel;
      process.env.OPENAI_ADVENTURE_CONTENT_MODEL = oldContentModel;
    }
  });
});

function createGenerator(client: MockOpenAIClient): OpenAIAdventureContentGenerator {
  return new OpenAIAdventureContentGenerator({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5-content" },
    instructions: "Generate unlinked adventure content prompt",
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
  return loggerMock.info.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
}

function warnPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.warn.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
}

function errorPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.error.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
}

function debugPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.debug.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
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
