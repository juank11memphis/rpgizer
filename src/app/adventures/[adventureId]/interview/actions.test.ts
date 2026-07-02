import { describe, expect, it, vi } from "vitest";

import type { AnswerInterviewQuestionOutput } from "@/modules/game-master-assistant/application/answer-interview-question/output";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";

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
    const logger = createLoggerMock();
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
      logger,
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event:
          APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_VALIDATION_FAILED,
        adventureId: "adventure-1",
        validationField: "answerText",
        validationCategory: "empty",
      }),
    );
  });

  it("redirects unauthenticated Users through login", async () => {
    const logger = createLoggerMock();
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => ({ status: "unauthenticated" }),
      answerInterviewQuestion: vi.fn(),
      redirectTo,
      logger,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({ adventureId: "adventure-1", answerText: "I can cook." }),
      ),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/login?next=%2Fadventures%2Fadventure-1%2Finterview",
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event:
          APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_UNAUTHENTICATED_REDIRECT,
        adventureId: "adventure-1",
        redirectDestination:
          "/login?next=%2Fadventures%2Fadventure-1%2Finterview",
      }),
    );
  });

  it("submits a trimmed answer and returns the updated transcript", async () => {
    const logger = createLoggerMock();
    const answerInterviewQuestion = vi.fn().mockResolvedValue(successOutput());
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
      logger,
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
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_SUCCESS,
        userId: "user-1",
        adventureId: "adventure-1",
        mode: "answer",
        draftReadinessStatus: "not_ready",
        draftInterviewStatus: "interviewing",
      }),
    );
  });

  it("returns success without redirecting when the interview is provisionally ready", async () => {
    const logger = createLoggerMock();
    const answerInterviewQuestion = vi.fn().mockResolvedValue(
      successOutput({
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
        gameMasterMessage:
          "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      }),
    );
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
      logger,
    });

    await expect(
      action(
        initialInterviewAnswerFormState,
        buildFormData({
          adventureId: "adventure-1",
          answerText: "No safety concerns.",
        }),
      ),
    ).resolves.toMatchObject({
      status: "success",
      draft: {
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
      },
      transcript: [
        expect.objectContaining({ content: "I can cook eggs and pasta." }),
        expect.objectContaining({
          content:
            "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
        }),
      ],
    });
    expect(answerInterviewQuestion).toHaveBeenCalledWith({
      userId: "user-1",
      adventureId: "adventure-1",
      answerText: "No safety concerns.",
    });
  });

  it("returns safe recoverable failure copy and retry metadata", async () => {
    const logger = createLoggerMock();
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion: vi.fn().mockResolvedValue(recoverableFailureOutput()),
      redirectTo,
      logger,
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event:
          APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_RECOVERABLE_FAILURE,
        userId: "user-1",
        adventureId: "adventure-1",
        mode: "answer",
        retryUserMessageId: "message-3",
      }),
    );
  });

  it("logs expected errors without private answer text", async () => {
    const logger = createLoggerMock();
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion: vi.fn().mockResolvedValue(expectedErrorOutput()),
      redirectTo,
      logger,
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
      status: "form_error",
      formError: "The Interview is not ready to confirm yet.",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.not.objectContaining({
        answerText: expect.any(String),
        transcript: expect.anything(),
      }),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event:
          APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_EXPECTED_ERROR,
        userId: "user-1",
        adventureId: "adventure-1",
        mode: "answer",
      }),
    );
  });

  it("maps retry metadata without sending another answer text", async () => {
    const logger = createLoggerMock();
    const answerInterviewQuestion = vi.fn().mockResolvedValue(successOutput());
    const action = createSubmitInterviewAnswerAction({
      requireCurrentUser: async () => authenticatedUser(),
      answerInterviewQuestion,
      redirectTo,
      logger,
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
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_SUCCESS,
        mode: "retry",
        adventureId: "adventure-1",
      }),
    );
  });
});

function createLoggerMock() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
  };
}

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
  interviewStatus?: "interviewing" | "awaiting_confirmation" | "confirmed";
  gameMasterMessage?: string;
} = {}): AnswerInterviewQuestionOutput {
  const readinessStatus = input.readinessStatus ?? "not_ready";
  const gameMasterMessage =
    input.gameMasterMessage ?? "What tools do you already have?";

  return {
    status: "success",
    draft: draft({
      readinessStatus,
      interviewStatus: input.interviewStatus,
    }),
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

function expectedErrorOutput(): AnswerInterviewQuestionOutput {
  return {
    status: "expected_error",
    draft: draft(),
    transcript: [
      message("message-3", "user", "I can cook eggs and pasta.", 3),
    ],
    message: "The Interview is not ready to confirm yet.",
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
