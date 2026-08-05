import { vi, type Mock } from "vitest";
import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import type { InterviewTurnRequest } from "../application/start-adventure-interview/ports";

type CreateResponseMock = Mock<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>;

export type MockOpenAIClient = {
  responses: {
    create: CreateResponseMock;
  };
};

export function createMockClient(response: Response | Promise<Response>): MockOpenAIClient {
  return {
    responses: {
      create: vi.fn<(params: ResponseCreateParamsNonStreaming) => Promise<Response>>().mockReturnValue(
        response instanceof Promise ? response : Promise.resolve(response),
      ),
    },
  };
}

export function responseWithOutput(outputText: string): Response {
  return {
    status: "completed",
    output_text: outputText,
    output: [],
  } as unknown as Response;
}

export function baseRequest(): InterviewTurnRequest {
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
