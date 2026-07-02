import { describe, expect, it, vi } from "vitest";

import type { AnswerInterviewQuestionOutput } from "@/modules/game-master-assistant/application/answer-interview-question/output";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";

import {
  createSubmitInterviewAnswerAction,
  EMPTY_ANSWER_MESSAGE,
  initialInterviewAnswerFormState,
  INTERVIEW_SAVE_FAILURE_MESSAGE,
} from "./actions-core";

function buildFormData(input: {
  adventureId?: string;
  answerText?: string;
  retryUserMessageId?: string;
}): FormData {
  const formData = new FormData();

  if (input.adventureId !== undefined) {
    formData.set("adventureId", input.adventureId);
  }

  if (input.answerText !== undefined) {
    formData.set("answerText", input.answerText);
  }

  if (input.retryUserMessageId !== undefined) {
    formData.set("retryUserMessageId", input.retryUserMessageId);
  }

  return formData;
}

function redirectTo(destination: string): never {
  throw new Error(`NEXT_REDIRECT:${destination}`);
}

describe("submitInterviewAnswerAction", () => {
  it("returns empty validation without calling the use case", async () => {
    const answerInterviewQuestion = vi.fn();
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({ adventureId: "adventure-1", answerText: "   " }),
      ),
    ).resolves.toMatchObject({
      status: "field_error",
      fieldError: EMPTY_ANSWER_MESSAGE,
    });
    expect(answerInterviewQuestion).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated Users through login", async () => {
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => ({ status: "unauthenticated" }),
      answerInterviewQuestion: vi.fn(),
      redirectTo,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({ adventureId: "adventure-1", answerText: "I can cook." }),
      ),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fadventures%2Fadventure-1%2Finterview",
    );
  });

  it("submits a trimmed answer and returns the updated transcript", async () => {
    const answerInterviewQuestion = vi.fn().mockResolvedValue(successOutput());
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({
          adventureId: "adventure-1",
          answerText: "  I can cook eggs and pasta.  ",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      formError: null,
      retryUserMessageId: null,
      transcript: [
        expect.objectContaining({ content: "I can cook eggs and pasta." }),
        expect.objectContaining({ content: "What tools do you already have?" }),
      ],
    });
    expect(answerInterviewQuestion).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
      answerText: "I can cook eggs and pasta.",
    });
  });

  it("redirects to the forge step when the interview is ready to generate", async () => {
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion: vi.fn().mockResolvedValue(
        successOutput({
          readinessStatus: "ready_to_generate",
          gameMasterMessage: "I’ve got enough to forge your Adventure.",
        }),
      ),
      redirectTo,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({
          adventureId: "adventure-1",
          answerText: "No safety concerns.",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/adventures/adventure-1/forge");
  });

  it("returns safe recoverable failure copy and retry metadata", async () => {
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion: vi.fn().mockResolvedValue(recoverableFailureOutput()),
      redirectTo,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({
          adventureId: "adventure-1",
          answerText: "I can cook eggs and pasta.",
        }),
      ),
    ).resolves.toMatchObject({
      status: "recoverable_failure",
      formError: INTERVIEW_SAVE_FAILURE_MESSAGE,
      retryUserMessageId: "message-3",
      transcript: [
        expect.objectContaining({ content: "I can cook eggs and pasta." }),
      ],
    });
  });

  it("maps retry metadata without sending another answer text", async () => {
    const answerInterviewQuestion = vi.fn().mockResolvedValue(successOutput());
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
    });

    await action(
      initialInterviewAnswerFormState,
      buildFormData({
        adventureId: "adventure-1",
        retryUserMessageId: "message-3",
      }),
    );

    expect(answerInterviewQuestion).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
      retryUserMessageId: "message-3",
    });
  });
});

function authenticatedUser(): RequireCurrentUserResult {
  return {
    status: "authenticated",
    user: {
      id: "user-1",
      name: null,
      email: null,
      image: null,
    },
  };
}

function successOutput(input: {
  readinessStatus?: "not_ready" | "ready_to_generate";
  gameMasterMessage?: string;
} = {}): AnswerInterviewQuestionOutput {
  const readinessStatus = input.readinessStatus ?? "not_ready";
  const gameMasterMessage =
    input.gameMasterMessage ?? "What tools do you already have?";

  return {
    status: "success",
    draft: draft({ readinessStatus }),
    transcript: [
      message("message-3", "user", "I can cook eggs and pasta.", 3),
      message("message-4", "game_master", gameMasterMessage, 4),
    ],
    userMessage: message("message-3", "user", "I can cook eggs and pasta.", 3),
    gameMasterMessage: message(
      "message-4",
      "game_master",
      gameMasterMessage,
      4,
    ),
  };
}

function recoverableFailureOutput(): AnswerInterviewQuestionOutput {
  const preservedUserMessage = message(
    "message-3",
    "user",
    "I can cook eggs and pasta.",
    3,
  );

  return {
    status: "recoverable_failure",
    draft: draft(),
    transcript: [preservedUserMessage],
    preservedUserMessage,
    retryUserMessageId: preservedUserMessage.id,
    message: INTERVIEW_SAVE_FAILURE_MESSAGE,
  };
}

function draft(input: {
  readinessStatus?: "not_ready" | "ready_to_generate";
  interviewStatus?: "interviewing" | "awaiting_confirmation" | "confirmed";
} = {}) {
  return {
    id: "adventure-1",
    goalText: "Become a chef",
    state: "drafting" as const,
    readinessStatus: input.readinessStatus ?? "not_ready",
    interviewStatus: input.interviewStatus ?? "interviewing",
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
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
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}
