import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { parseGeneratedAdventureContent, type GeneratedAdventureContent } from "../domain/generated-adventure-content";
import {
  parseGeneratedAdventureDependencyLinks,
  type GeneratedAdventureDependencyLinks,
} from "../domain/generated-adventure-dependencies";
import {
  GENERATED_ADVENTURE_XP_BALANCE_FORMAT,
  OpenAIAdventureXpBalancer,
} from "./openai-adventure-xp-balancer";

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

const validXpPayload = buildGeneratedAdventureXpBalanceBoundaryPayload();

describe("OpenAIAdventureXpBalancer", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("calls OpenAI Responses with strict XP-only schema and returns parsed XP balance", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validXpPayload)));
    const balancer = createBalancer(client);

    const result = await balancer.balanceAdventureXp(validContent(), validDependencies(), baseContext());

    expect(result).toEqual(validXpPayload);
    expect(client.responses.create).toHaveBeenCalledTimes(1);
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5-xp",
        instructions: "Balance XP prompt",
        max_output_tokens: 2000,
        store: false,
        safety_identifier: "user-1",
      }),
    );

    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_generated_adventure_xp_balance",
      strict: true,
      schema: expect.objectContaining({
        additionalProperties: false,
        required: ["questXp", "bossFightXp"],
      }),
    });
    const schemaText = JSON.stringify(request?.text?.format);
    expect(schemaText).toContain("questXp");
    expect(schemaText).toContain("bossFightXp");
    expect(schemaText).toContain("skillRewards");
    expect(schemaText).toContain("skillKey");
    expect(schemaText).toContain("xp");
    expect(schemaText).not.toContain("inventoryItemKeys");
    expect(schemaText).not.toContain("skillKeys");
    expect(schemaText).not.toContain("description");
    expect(schemaText).not.toContain("title");

    const inputText = JSON.stringify(request?.input);
    expect(inputText).toContain("plan-first-menu");
    expect(inputText).toContain("linkedSkillKeys");
    expect(inputText).toContain("meal-planning");
    expect(inputText).toContain("xpRange");
    expect(inputText).not.toContain("skillRewards");
    expect(inputText).not.toContain("inventoryItemKeys");
    expect(inputText).not.toContain('"xp":25');
  });

  it("exports a strict structured output format with no content or dependency-link fields", () => {
    expect(GENERATED_ADVENTURE_XP_BALANCE_FORMAT).toMatchObject({
      type: "json_schema",
      strict: true,
      schema: {
        additionalProperties: false,
        required: ["questXp", "bossFightXp"],
      },
    });
    const schemaText = JSON.stringify(GENERATED_ADVENTURE_XP_BALANCE_FORMAT);
    expect(schemaText).not.toContain("inventoryItemKeys");
    expect(schemaText).not.toContain("skillKeys");
    expect(schemaText).not.toContain("acts");
    expect(schemaText).not.toContain("description");
  });

  it("emits safe started and completed logs with XP balancing counts", async () => {
    await createBalancer(createMockClient(responseWithOutput(JSON.stringify(validXpPayload)))).balanceAdventureXp(
      validContent(),
      validDependencies(),
      baseContext(),
    );

    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_STARTED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "balance_adventure_xp",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5-xp",
        step: "xp_balancing",
        questCount: 2,
        bossFightCount: 1,
        skillCount: 2,
        linkedRewardCount: 4,
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_COMPLETED)).toEqual([
      expect.objectContaining({
        flow: "ai_provider",
        operation: "balance_adventure_xp",
        result: "success",
        model: "gpt-5.5-xp",
        step: "xp_balancing",
        questXpRecordCount: 2,
        bossFightXpRecordCount: 1,
        questXpRewardCount: 2,
        bossFightXpRewardCount: 2,
        totalXpRewardCount: 4,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Balance XP prompt");
    expect(serializedLogPayloads()).not.toContain("Choose one realistic weeknight dinner");
    expect(serializedLogPayloads()).not.toContain(JSON.stringify(validXpPayload));
  });

  it("rejects malformed JSON, blank output, incomplete status, refusal output, and invalid XP", async () => {
    const refusedClient = createMockClient({
      ...responseWithOutput(""),
      output: [{ type: "message", content: [{ type: "refusal", refusal: "No." }] }],
    } as Response);
    const incompleteClient = createMockClient({
      ...responseWithOutput(JSON.stringify(validXpPayload)),
      status: "incomplete",
    } as Response);
    const blankClient = createMockClient(responseWithOutput("   "));
    const malformedClient = createMockClient(responseWithOutput("not-json"));
    const invalidXpClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            questXp: [
              { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp: 101 }] },
              { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            ],
          }),
        ),
      ),
    );

    await expect(createBalancer(refusedClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(incompleteClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(blankClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(malformedClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(invalidXpClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
      message: "OpenAI structured output was not valid Adventure XP balance.",
    });
  });

  it("rejects missing XP, duplicate XP, and unlinked Skill rewards through the XP parser contract", async () => {
    const missingXpClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            bossFightXp: [
              { bossFightKey: "first-weeknight-service", skillRewards: [{ skillKey: "meal-planning", xp: 40 }] },
            ],
          }),
        ),
      ),
    );
    const duplicateXpClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            questXp: [
              {
                questKey: "plan-first-menu",
                skillRewards: [
                  { skillKey: "meal-planning", xp: 20 },
                  { skillKey: "meal-planning", xp: 25 },
                ],
              },
              { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            ],
          }),
        ),
      ),
    );
    const unlinkedXpClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            questXp: [
              { questKey: "plan-first-menu", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
              { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            ],
          }),
        ),
      ),
    );

    await expect(createBalancer(missingXpClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(duplicateXpClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(unlinkedXpClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("returns only XP data and cannot add, remove, rename, or rewrite Adventure content or links", async () => {
    const content = validContent();
    const dependencies = validDependencies();
    const contentBefore = structuredClone(content);
    const dependenciesBefore = structuredClone(dependencies);
    const xpBalance = await createBalancer(
      createMockClient(
        responseWithOutput(
          JSON.stringify({
            ...validXpPayload,
            title: "A rewritten adventure title",
            questLinks: [],
          }),
        ),
      ),
    ).balanceAdventureXp(content, dependencies);

    expect(xpBalance).toEqual(validXpPayload);
    expect(content).toEqual(contentBefore);
    expect(dependencies).toEqual(dependenciesBefore);
    expect(xpBalance).not.toHaveProperty("title");
    expect(xpBalance).not.toHaveProperty("questLinks");
  });

  it("logs invalid and failed outcomes without leaking prompts, raw responses, API keys, or generated prose", async () => {
    await expect(
      createBalancer(createMockClient(responseWithOutput("not-json"))).balanceAdventureXp(
        validContent(),
        validDependencies(),
        baseContext(),
      ),
    ).rejects.toBeInstanceOf(AdventureGeneratorError);
    await expect(
      createBalancer(createMockClient(Promise.reject(new Error("raw provider failure with sk-test")))).balanceAdventureXp(
        validContent(),
        validDependencies(),
        baseContext(),
      ),
    ).rejects.toMatchObject({ code: "provider_request_failed" });

    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_INVALID)).toEqual([
      expect.objectContaining({
        providerErrorCategory: "invalid_output",
        step: "xp_balancing",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
    ]);
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_XP_BALANCING_FAILED)).toEqual([
      expect.objectContaining({
        providerErrorCategory: "request_failed",
        step: "xp_balancing",
        error: expect.objectContaining({ message: "Provider request failed." }),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Balance XP prompt");
    expect(serializedLogPayloads()).not.toContain("not-json");
    expect(serializedLogPayloads()).not.toContain("sk-test");
    expect(serializedLogPayloads()).not.toContain("Cook the planned dinner");
  });

  it("emits redacted and truncated payload debug logs only when enabled", async () => {
    process.env.AI_PAYLOAD_LOGGING_ENABLED = "1";
    process.env.AI_PAYLOAD_LOG_MAX_CHARS = "6";

    await createBalancer(
      createMockClient({
        ...responseWithOutput(JSON.stringify(validXpPayload)),
        authorization: "Bearer secret-token",
      } as unknown as Response),
    ).balanceAdventureXp(validContent(), validDependencies(), baseContext());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        operation: "balance_adventure_xp",
        step: "xp_balancing",
        direction: "request",
      }),
      expect.objectContaining({
        operation: "balance_adventure_xp",
        step: "xp_balancing",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ authorization: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("Bearer secret-token");
    expect(serializedLogPayloads()).not.toContain(JSON.stringify(validXpPayload));
  });

  it("loads the default prompt with RPG XP-only balancing constraints", async () => {
    const prompt = await readFile(
      path.join(process.cwd(), "src/modules/adventure-planner/infra/prompts/balance-adventure-xp.md"),
      "utf8",
    );

    expect(prompt).toContain("Adventure XP Balancer");
    expect(prompt).toContain("return only Skill XP assignments");
    expect(prompt).toContain("Never invent, rename, add, remove, rewrite content, or change links");
    expect(prompt).toContain("5..100");
    expect(prompt).toContain("effort");
    expect(prompt).toContain("milestone importance");
    expect(prompt).toContain("optional difficulty");
    expect(prompt).toContain("Boss Fight significance");
    expect(prompt).toContain("progression stage");
  });

  it("surfaces missing configuration as a stable XP balancer configuration error", () => {
    const oldApiKey = process.env.OPENAI_API_KEY;
    const oldAdventureModel = process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    const oldXpModel = process.env.OPENAI_ADVENTURE_XP_BALANCER_MODEL;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_ADVENTURE_GENERATION_MODEL;
    delete process.env.OPENAI_ADVENTURE_XP_BALANCER_MODEL;

    try {
      expect(() => new OpenAIAdventureXpBalancer()).toThrow(AdventureGeneratorError);
      expect(() => new OpenAIAdventureXpBalancer()).toThrow("OPENAI_API_KEY is required");
      expect(() => new OpenAIAdventureXpBalancer()).toThrow("OPENAI_ADVENTURE_XP_BALANCER_MODEL");
    } finally {
      process.env.OPENAI_API_KEY = oldApiKey;
      process.env.OPENAI_ADVENTURE_GENERATION_MODEL = oldAdventureModel;
      process.env.OPENAI_ADVENTURE_XP_BALANCER_MODEL = oldXpModel;
    }
  });

  it("fails fast without broad repair retry for invalid output or provider request failures", async () => {
    const invalidClient = createMockClient(
      responseWithOutput(
        JSON.stringify(
          buildGeneratedAdventureXpBalanceBoundaryPayload({
            questXp: [
              { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp: 101 }] },
              { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
            ],
          }),
        ),
      ),
    );
    const failedClient = createMockClient(Promise.reject(new Error("provider down")));

    await expect(createBalancer(invalidClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createBalancer(failedClient).balanceAdventureXp(validContent(), validDependencies())).rejects.toMatchObject({
      code: "provider_request_failed",
    });

    expect(invalidClient.responses.create).toHaveBeenCalledTimes(1);
    expect(failedClient.responses.create).toHaveBeenCalledTimes(1);
    expect(serializedLogPayloads()).not.toContain("retried");
    expect(JSON.stringify(APPLICATION_LOG_EVENTS)).not.toContain("XP_BALANCING_RETRIED");
  });
});

function createBalancer(client: MockOpenAIClient): OpenAIAdventureXpBalancer {
  return new OpenAIAdventureXpBalancer({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5-xp" },
    instructions: "Balance XP prompt",
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

function validContent(): GeneratedAdventureContent {
  return parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
}

function validDependencies(): GeneratedAdventureDependencyLinks {
  return parseGeneratedAdventureDependencyLinks(
    buildGeneratedAdventureDependencyLinksBoundaryPayload(),
    validContent(),
  );
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
