import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { parseGeneratedAdventureContent, type GeneratedAdventureContent } from "../domain/generated-adventure-content";
import {
  GENERATED_ADVENTURE_DEPENDENCY_LINKS_FORMAT,
  OpenAIAdventureDependencyLinker,
} from "./openai-adventure-dependency-linker";

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

const validLinksPayload = buildGeneratedAdventureDependencyLinksBoundaryPayload();

describe("OpenAIAdventureDependencyLinker", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("calls OpenAI Responses with strict link-only schema and returns parsed dependency links", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validLinksPayload)));
    const linker = createLinker(client);

    const result = await linker.linkAdventureDependencies(validContent(), baseContext());

    expect(result).toEqual(validLinksPayload);
    expect(client.responses.create).toHaveBeenCalledTimes(1);
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5-linker",
        instructions: "Link dependencies prompt",
        max_output_tokens: 2000,
        store: false,
        safety_identifier: "user-1",
      }),
    );

    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_generated_adventure_dependency_links",
      strict: true,
      schema: expect.objectContaining({
        additionalProperties: false,
        required: ["questLinks", "bossFightLinks"],
      }),
    });
    const schemaText = JSON.stringify(request?.text?.format);
    expect(schemaText).toContain("questLinks");
    expect(schemaText).toContain("bossFightLinks");
    expect(schemaText).toContain("skillKeys");
    expect(schemaText).toContain("inventoryItemKeys");
    expect(schemaText).not.toContain("title");
    expect(schemaText).not.toContain("description");
    expect(schemaText.toLowerCase()).not.toContain("xp");
    expect(schemaText).not.toContain("skillRewards");

    const inputText = JSON.stringify(request?.input);
    expect(inputText).toContain("plan-first-menu");
    expect(inputText).toContain("meal-planning");
    expect(inputText).not.toContain("skillRewards");
    expect(inputText).not.toContain('"xp"');
  });

  it("exports a strict structured output format with no content or XP fields", () => {
    expect(GENERATED_ADVENTURE_DEPENDENCY_LINKS_FORMAT).toMatchObject({
      type: "json_schema",
      strict: true,
      schema: {
        additionalProperties: false,
        required: ["questLinks", "bossFightLinks"],
      },
    });
    expect(JSON.stringify(GENERATED_ADVENTURE_DEPENDENCY_LINKS_FORMAT).toLowerCase()).not.toContain(
      "xp",
    );
  });

  it("emits safe started and completed logs with dependency-link counts", async () => {
    await createLinker(createMockClient(responseWithOutput(JSON.stringify(validLinksPayload)))).linkAdventureDependencies(
      validContent(),
      baseContext(),
    );

    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_STARTED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "link_adventure_dependencies",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5-linker",
        step: "dependency_linking",
        questCount: 2,
        bossFightCount: 1,
        skillCount: 2,
        inventoryItemCount: 2,
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_COMPLETED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "link_adventure_dependencies",
        result: "success",
        model: "gpt-5.5-linker",
        step: "dependency_linking",
        questLinkCount: 2,
        bossFightLinkCount: 1,
        linkedQuestSkillCount: 2,
        linkedBossFightSkillCount: 2,
        linkedInventoryItemCount: 4,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Link dependencies prompt");
    expect(serializedLogPayloads()).not.toContain("Choose one realistic weeknight dinner");
    expect(serializedLogPayloads()).not.toContain(JSON.stringify(validLinksPayload));
  });

  it("rejects malformed JSON, blank output, incomplete status, refusal output, and invalid references", async () => {
    const refusedClient = createMockClient({
      ...responseWithOutput(""),
      output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }],
    } as Response);
    const incompleteClient = createMockClient({
      ...responseWithOutput(JSON.stringify(validLinksPayload)),
      status: "incomplete",
    } as Response);
    const blankClient = createMockClient(responseWithOutput("   "));
    const malformedClient = createMockClient(responseWithOutput("not-json"));
    const invalidReferenceClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureDependencyLinksBoundaryPayload({
            questLinks: [
              { questKey: "plan-first-menu", skillKeys: ["missing-skill"], inventoryItemKeys: [] },
              { questKey: "prep-station-reset", skillKeys: ["knife-basics"], inventoryItemKeys: [] },
            ],
          }),
        ),
      ),
    );

    await expect(createLinker(refusedClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createLinker(incompleteClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createLinker(blankClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createLinker(malformedClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(
      createLinker(invalidReferenceClient).linkAdventureDependencies(validContent()),
    ).rejects.toMatchObject({
      code: "provider_output_invalid",
      message: "OpenAI structured output was not valid Adventure dependency links.",
    });
  });

  it("rejects duplicate references and missing Quest or Boss Fight coverage", async () => {
    const duplicateClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureDependencyLinksBoundaryPayload({
            questLinks: [
              { questKey: "plan-first-menu", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
              { questKey: "plan-first-menu", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
            ],
          }),
        ),
      ),
    );
    const missingCoverageClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureDependencyLinksBoundaryPayload({
            bossFightLinks: [],
          }),
        ),
      ),
    );

    await expect(createLinker(duplicateClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createLinker(missingCoverageClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("returns only link data and cannot add, remove, or rewrite Adventure content", async () => {
    const content = validContent();
    const before = structuredClone(content);
    const links = await createLinker(
      createMockClient(
        responseWithOutput(
          JSON.stringify({
            ...validLinksPayload,
            title: "A rewritten adventure title",
            acts: [],
          }),
        ),
      ),
    ).linkAdventureDependencies(content);

    expect(links).toEqual(validLinksPayload);
    expect(content).toEqual(before);
    expect(links).not.toHaveProperty("title");
    expect(links.questLinks).toHaveLength(2);
  });

  it("logs invalid and failed outcomes without leaking prompts, raw responses, API keys, or generated prose", async () => {
    await expect(
      createLinker(createMockClient(responseWithOutput("not-json"))).linkAdventureDependencies(
        validContent(),
        baseContext(),
      ),
    ).rejects.toBeInstanceOf(AdventureGeneratorError);
    await expect(
      createLinker(createMockClient(Promise.reject(new Error("raw provider failure with sk-test")))).linkAdventureDependencies(
        validContent(),
        baseContext(),
      ),
    ).rejects.toMatchObject({ code: "provider_request_failed" });

    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_INVALID)).toEqual([
      expect.objectContaining({
        result: "retrying",
        providerErrorCategory: "invalid_output",
        step: "dependency_linking",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
      expect.objectContaining({
        result: "failure",
        providerErrorCategory: "invalid_output",
        step: "dependency_linking",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
    ]);
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_FAILED)).toEqual([
      expect.objectContaining({
        providerErrorCategory: "request_failed",
        step: "dependency_linking",
        error: expect.objectContaining({ message: "Provider request failed." }),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Link dependencies prompt");
    expect(serializedLogPayloads()).not.toContain("not-json");
    expect(serializedLogPayloads()).not.toContain("sk-test");
    expect(serializedLogPayloads()).not.toContain("Cook the planned dinner");
  });

  it("emits redacted and truncated payload debug logs only when enabled", async () => {
    process.env.AI_PAYLOAD_LOGGING_ENABLED = "1";
    process.env.AI_PAYLOAD_LOG_MAX_CHARS = "6";

    await createLinker(
      createMockClient({
        ...responseWithOutput(JSON.stringify(validLinksPayload)),
        authorization: "Bearer secret-token",
      } as unknown as Response),
    ).linkAdventureDependencies(validContent(), baseContext());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        operation: "link_adventure_dependencies",
        step: "dependency_linking",
        direction: "request",
      }),
      expect.objectContaining({
        operation: "link_adventure_dependencies",
        step: "dependency_linking",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ authorization: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("Bearer secret-token");
    expect(serializedLogPayloads()).not.toContain(JSON.stringify(validLinksPayload));
  });

  it("loads the default prompt with link-only constraints", async () => {
    const prompt = await readFile(
      path.join(process.cwd(), "src/modules/adventure-planner/infra/prompts/link-adventure-dependencies.md"),
      "utf8",
    );

    expect(prompt).toContain("Adventure Dependency Linker");
    expect(prompt).toContain("return only dependency links");
    expect(prompt).toContain("Use only keys present in the input");
    expect(prompt).toContain("Never invent, rename, add, remove, or rewrite Adventure content");
    expect(prompt).toContain("Do not assign XP");
  });

  it("surfaces missing configuration as a stable configuration error", () => {
    const oldApiKey = process.env.OPENAI_API_KEY;
    const oldAdventureModel = process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    const oldLinkerModel = process.env.OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    delete process.env.OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL;

    try {
      expect(() => new OpenAIAdventureDependencyLinker()).toThrow(AdventureGeneratorError);
      expect(() => new OpenAIAdventureDependencyLinker()).toThrow("OPENAI_API_KEY is required");
    } finally {
      process.env.OPENAI_API_KEY = oldApiKey;
      process.env.OPENAI_ADVENTURE_GENERATION_MODEL = oldAdventureModel;
      process.env.OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL = oldLinkerModel;
    }
  });

  it("retries invalid dependency output once but still fails fast for provider request failures", async () => {
    const invalidClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureDependencyLinksBoundaryPayload({
            questLinks: [
              { questKey: "plan-first-menu", skillKeys: ["missing-skill"], inventoryItemKeys: [] },
              { questKey: "prep-station-reset", skillKeys: ["knife-basics"], inventoryItemKeys: [] },
            ],
          }),
        ),
      ),
    );
    const failedClient = createMockClient(Promise.reject(new Error("provider down")));

    await expect(createLinker(invalidClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createLinker(failedClient).linkAdventureDependencies(validContent())).rejects.toMatchObject({
      code: "provider_request_failed",
    });

    expect(invalidClient.responses.create).toHaveBeenCalledTimes(2);
    expect(failedClient.responses.create).toHaveBeenCalledTimes(1);
    expect(serializedLogPayloads()).toContain("retrying");
  });

  it("recovers when the second dependency linking output attempt is valid", async () => {
    const client = createMockClientSequence([
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureDependencyLinksBoundaryPayload({
            questLinks: [
              { questKey: "unknown-quest", skillKeys: ["meal-planning"], inventoryItemKeys: [] },
              { questKey: "prep-station-reset", skillKeys: ["knife-basics"], inventoryItemKeys: [] },
            ],
          }),
        ),
      ),
      responseWithOutput(JSON.stringify(validLinksPayload)),
    ]);

    await expect(createLinker(client).linkAdventureDependencies(validContent(), baseContext())).resolves.toEqual(validLinksPayload);

    expect(client.responses.create).toHaveBeenCalledTimes(2);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_INVALID)).toEqual([
      expect.objectContaining({
        result: "retrying",
        attempt: 1,
        nextAttempt: 2,
        maxAttempts: 2,
      }),
    ]);
  });
});

function createLinker(client: MockOpenAIClient): OpenAIAdventureDependencyLinker {
  return new OpenAIAdventureDependencyLinker({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5-linker" },
    instructions: "Link dependencies prompt",
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

function createMockClientSequence(responses: Response[]): MockOpenAIClient {
  return {
    responses: {
      create: vi.fn<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>()
        .mockImplementationOnce(() => Promise.resolve(responses[0] as Response))
        .mockImplementationOnce(() => Promise.resolve(responses[1] as Response)),
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

function validContent(): GeneratedAdventureContent {
  return parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
}

function baseContext() {
  return {
    userId: "user-1",
    adventureId: "adventure-1",
  };
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
