import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import { validInterviewOutputArtifact } from "../application/test/fake-interview-output-artifact-generator";
import type { InterviewOutputArtifactGenerationRequest } from "../application/generate-interview-output-artifact/ports";
import { OpenAIInterviewOutputArtifactGenerator } from "./openai-interview-output-artifact-generator";

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

const validArtifact = validInterviewOutputArtifact();

describe("OpenAIInterviewOutputArtifactGenerator", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("calls OpenAI Responses with strict structured output and returns parsed artifact data", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify(validArtifact)));
    const generator = createGenerator(client);

    const result = await generator.generateArtifact(baseRequest());

    expect(result).toEqual(validArtifact);
    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        instructions: "Artifact prompt",
        max_output_tokens: 1200,
        store: false,
        safety_identifier: "user-1",
      }),
    );
    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_interview_output_artifact",
      strict: true,
    });
    expect(request?.input).toEqual([
      {
        role: "user",
        content: JSON.stringify({
          adventureId: "adventure-1",
          goalText: "Become a chef",
          readinessStatus: "ready_to_generate",
          interviewStatus: "confirmed",
        }),
      },
      { role: "user", content: "Become a chef" },
      { role: "assistant", content: "What is your current cooking level?" },
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5",
        durationMs: expect.any(Number),
      }),
    ]);
    expect(debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG)).toEqual([]);
  });

  it("trims parsed artifact strings before returning them", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validArtifact,
          goalSummary: "  Become a confident chef.  ",
        }),
      ),
    );

    await expect(createGenerator(client).generateArtifact(baseRequest())).resolves.toMatchObject({
      goalSummary: "Become a confident chef.",
    });
  });

  it("rejects missing required artifact signals as invalid provider output", async () => {
    const client = createMockClient(responseWithOutput(JSON.stringify({ goalSummary: "Too little" })));

    await expect(createGenerator(client).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        result: "failure",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5",
        providerErrorCode: "provider_output_invalid",
        providerErrorCategory: "invalid_output",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("normalizes API request failures", async () => {
    const client = createMockClient(Promise.reject(new Error("raw provider failure")));

    await expect(createGenerator(client).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI interview output artifact request failed.",
    });
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        result: "failure",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5",
        providerErrorCategory: "request_failed",
        error: expect.objectContaining({ name: "Error" }),
        durationMs: expect.any(Number),
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
      ...responseWithOutput(JSON.stringify(validArtifact)),
      status: "incomplete",
    } as Response);
    const blankClient = createMockClient(responseWithOutput("   "));
    const malformedClient = createMockClient(responseWithOutput("not-json"));

    await expect(createGenerator(refusedClient).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(incompleteClient).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(blankClient).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createGenerator(malformedClient).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });


  it("emits redacted and truncated payload debug logs only when enabled", async () => {
    process.env.AI_PAYLOAD_LOGGING_ENABLED = "1";
    process.env.AI_PAYLOAD_LOG_MAX_CHARS = "6";
    const client = createMockClient({
      ...responseWithOutput(JSON.stringify(validArtifact)),
      authorization: "Bearer secret-token",
    } as unknown as Response);

    await createGenerator(client).generateArtifact(baseRequest());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "request",
      }),
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
        flow: "ai_provider",
        operation: "interview_output_artifact.generate",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ authorization: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("Bearer secret-token");
    expect(serializedLogPayloads()).not.toContain("Become a chef");
    expect(serializedLogPayloads()).not.toContain("Artifact prompt");
  });

  it("surfaces missing configuration as a stable configuration error", () => {
    expect(() => new OpenAIInterviewOutputArtifactGenerator()).toThrow(GameMasterInterviewerError);
  });
});

function createGenerator(client: MockOpenAIClient): OpenAIInterviewOutputArtifactGenerator {
  return new OpenAIInterviewOutputArtifactGenerator({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5" },
    instructions: "Artifact prompt",
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

function baseRequest(): InterviewOutputArtifactGenerationRequest {
  return {
    userId: "user-1",
    adventureId: "adventure-1",
    goalText: "Become a chef",
    readinessStatus: "ready_to_generate",
    interviewStatus: "confirmed",
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
