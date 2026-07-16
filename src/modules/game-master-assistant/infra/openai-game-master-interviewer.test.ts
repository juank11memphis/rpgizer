import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { REDACTED_LOG_VALUE } from "../../../server/logging/redaction";
import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";
import type { InterviewTurnRequest } from "../application/start-adventure-interview/ports";
import { OpenAIGameMasterInterviewer } from "./openai-game-master-interviewer";

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

const validStructuredOutput = {
  messageToUser: "A fine quest. What does success look like in the real world?",
  readinessStatus: "not_ready",
  readinessConfirmation: "not_confirmed",
  coveredSignals: {
    motivation: true,
    successDefinition: false,
    currentStage: false,
    pastFriction: false,
    constraints: false,
    existingInventory: false,
    likelyMissingResources: false,
    safetyBoundary: true,
  },
  summaryDelta: "The User wants to become a chef because cooking feels creative.",
};

describe("OpenAIGameMasterInterviewer", () => {
  beforeEach(() => {
    loggerMock.debug.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    delete process.env.AI_PAYLOAD_LOGGING_ENABLED;
    delete process.env.AI_PAYLOAD_LOG_MAX_CHARS;
  });

  it("instructs ready output to ask for final confirmation instead of completion", () => {
    const prompt = readFileSync(
      join(process.cwd(), "src/modules/game-master-assistant/infra/prompts/game-master-interview.md"),
      "utf8",
    );

    expect(prompt).toContain(
      'If `readinessStatus` is `ready_to_generate` and `readinessConfirmation` is `not_confirmed`, `messageToUser` must ask a final confirmation question',
    );
    expect(prompt).toContain(
      "Do not combine “what have you tried?” with “what got in the way?”",
    );
    expect(prompt).toContain(
      "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
    );
    expect(prompt).toContain("metadata `interviewStatus` is `awaiting_confirmation`");
    expect(prompt).toContain("Set `readinessConfirmation` to `confirmed` only when the reply clearly means");
    expect(prompt).toContain("Mark it covered for ordinary low-risk goals once no special boundary is needed");
  });

  it("calls OpenAI Responses with the Markdown prompt as instructions and returns RPGizer-owned data", async () => {
    const client = createMockClient(
      responseWithOutput(JSON.stringify(validStructuredOutput)),
    );
    const interviewer = createInterviewer(client);

    const result = await interviewer.askNextQuestion(baseRequest());

    expect(result).toEqual({
      messageToUser: "A fine quest. What does success look like in the real world?",
      readinessStatus: "not_ready",
      readinessConfirmation: "not_confirmed",
      coveredSignals: ["motivation", "safetyBoundary"],
      summaryDelta: "The User wants to become a chef because cooking feels creative.",
    });

    expect(client.responses.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        instructions: "Prompt instructions",
        max_output_tokens: 800,
        store: false,
        safety_identifier: "user-1",
      }),
    );
    const request = client.responses.create.mock.calls[0]?.[0];
    expect(request?.text?.format).toMatchObject({
      type: "json_schema",
      name: "rpgizer_interview_turn_result",
      strict: true,
    });
    expect(request?.input).toEqual([
      {
        role: "user",
        content: JSON.stringify({
          adventureId: "adventure-1",
          goalText: "Become a chef",
          readinessStatus: "not_ready",
          interviewStatus: "interviewing",
        }),
      },
      { role: "user", content: "Become a chef" },
      { role: "assistant", content: "What is your current cooking level?" },
      { role: "user", content: "I can cook eggs and pasta." },
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_COMPLETED,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5",
        durationMs: expect.any(Number),
      }),
    ]);
    expect(debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG)).toEqual([]);
  });

  it("normalizes a blank summary delta to null", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          summaryDelta: "   ",
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).resolves.toMatchObject({
      summaryDelta: null,
    });
  });

  it("translates prompt loading failure into a stable provider request failure", async () => {
    const client = createMockClient(
      responseWithOutput(JSON.stringify(validStructuredOutput)),
    );
    const interviewer = new OpenAIGameMasterInterviewer({
      client,
      config: { apiKey: "sk-test", model: "gpt-5.5" },
      promptPath: "/tmp/rpgizer-missing-game-master-prompt.md",
    });

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
    });
    expect(client.responses.create).not.toHaveBeenCalled();
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
        result: "failure",
        userId: "user-1",
        adventureId: "adventure-1",
        model: "gpt-5.5",
        providerErrorCategory: "request_failed",
        error: expect.objectContaining({ name: expect.any(String) }),
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("translates API rejection into a stable provider request failure", async () => {
    const client = createMockClient(Promise.reject(new Error("401 raw provider detail")));
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI Game Master interviewer request failed.",
    });
    expect(errorPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_REQUEST_FAILED)).toHaveLength(1);
    expect(serializedLogPayloads()).not.toContain("sk-test");
  });

  it("rejects missing messageToUser before trusting provider output", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          messageToUser: " ",
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_OUTPUT_INVALID,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
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

  it("rejects invalid readiness status", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          readinessStatus: "almost_ready",
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("rejects invalid readiness confirmation", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          readinessConfirmation: "maybe",
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("rejects confirmed readiness without ready status", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          readinessStatus: "not_ready",
          readinessConfirmation: "confirmed",
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("rejects malformed covered signals", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          coveredSignals: {
            ...validStructuredOutput.coveredSignals,
            motivation: "yes",
          },
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("rejects invalid summary delta", async () => {
    const client = createMockClient(
      responseWithOutput(
        JSON.stringify({
          ...validStructuredOutput,
          summaryDelta: 123,
        }),
      ),
    );
    const interviewer = createInterviewer(client);

    await expect(interviewer.askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });

  it("rejects refused or incomplete output", async () => {
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
      ...responseWithOutput(JSON.stringify(validStructuredOutput)),
      status: "incomplete",
    } as Response);

    await expect(createInterviewer(refusedClient).askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
    await expect(createInterviewer(incompleteClient).askNextQuestion(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });
  });


  it("emits redacted and truncated payload debug logs only when enabled", async () => {
    process.env.AI_PAYLOAD_LOGGING_ENABLED = "1";
    process.env.AI_PAYLOAD_LOG_MAX_CHARS = "6";
    const client = createMockClient({
      ...responseWithOutput(JSON.stringify(validStructuredOutput)),
      apiKey: "sk-secret-provider-key",
    } as unknown as Response);
    const interviewer = createInterviewer(client);

    await interviewer.askNextQuestion(baseRequest());

    const debugPayloads = debugPayloadsFor(APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG);
    expect(debugPayloads).toHaveLength(2);
    expect(debugPayloads).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "request",
      }),
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.AI_OPENAI_PAYLOAD_DEBUG,
        flow: "ai_provider",
        operation: "game_master_interviewer.ask_next_question",
        userId: "user-1",
        adventureId: "adventure-1",
        direction: "response",
      }),
    ]);
    expect(debugPayloads[1]?.payload).toMatchObject({ apiKey: REDACTED_LOG_VALUE });
    expect(serializedLogPayloads()).toContain('"maxChars":6');
    expect(serializedLogPayloads()).not.toContain("sk-secret-provider-key");
    expect(serializedLogPayloads()).not.toContain("Become a chef");
    expect(serializedLogPayloads()).not.toContain("Prompt instructions");
  });

  it("surfaces missing configuration as a stable configuration error", () => {
    expect(() => new OpenAIGameMasterInterviewer()).toThrow(GameMasterInterviewerError);
  });
});

function createInterviewer(client: MockOpenAIClient): OpenAIGameMasterInterviewer {
  return new OpenAIGameMasterInterviewer({
    client,
    config: { apiKey: "sk-test", model: "gpt-5.5" },
    instructions: "Prompt instructions",
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

function baseRequest(): InterviewTurnRequest {
  return {
    userId: "user-1",
    adventureId: "adventure-1",
    goalText: "Become a chef",
    readinessStatus: "not_ready",
    interviewStatus: "interviewing",
    transcript: [
      message("message-1", "user", "Become a chef", 1),
      message("message-2", "game_master", "What is your current cooking level?", 2),
      message("message-3", "user", "I can cook eggs and pasta.", 3),
    ],
  };
}

function message(
  id: string,
  role: "user" | "game_master",
  content: string,
  sequenceNumber: number,
) {
  return {
    id,
    role,
    content,
    sequenceNumber,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}
