import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { describe, expect, it, vi, type Mock } from "vitest";

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

const validArtifact = validInterviewOutputArtifact();

describe("OpenAIInterviewOutputArtifactGenerator", () => {
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
  });

  it("normalizes API request failures", async () => {
    const client = createMockClient(Promise.reject(new Error("raw provider failure")));

    await expect(createGenerator(client).generateArtifact(baseRequest())).rejects.toMatchObject({
      code: "provider_request_failed",
      message: "OpenAI interview output artifact request failed.",
    });
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
