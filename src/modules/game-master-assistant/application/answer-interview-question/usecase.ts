import { normalizeRequiredInterviewText } from "../../domain/interview-message";
import { deriveInterviewStatusFromReadiness } from "../../domain/interview-status";
import type { InterviewMessage } from "../../domain/interview-message";
import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { serverLogger } from "../../../../server/logging/logger";
import {
  InterviewProviderFailure,
  normalizeInterviewProviderFailure,
} from "../start-adventure-interview/provider-error";
import type { AnswerInterviewQuestionInput } from "./input";
import type { AnswerInterviewQuestionOutput } from "./output";
import type {
  AnswerInterviewQuestionRepository,
  GameMasterInterviewer,
} from "./ports";

export type AnswerInterviewQuestionDependencies = {
  adventureDraftRepository: AnswerInterviewQuestionRepository;
  gameMasterInterviewer: GameMasterInterviewer;
};

export async function answerInterviewQuestion(
  input: AnswerInterviewQuestionInput,
  dependencies: AnswerInterviewQuestionDependencies,
): Promise<AnswerInterviewQuestionOutput> {
  const startedAt = Date.now();
  const retryUserMessageId = readRetryUserMessageId(input);
  const answerText = retryUserMessageId
    ? null
    : normalizeRequiredInterviewText("Answer", readAnswerText(input));
  const repository = dependencies.adventureDraftRepository;

  const existingInterview = await repository.getDraftWithTranscript({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  if (!existingInterview) {
    throw new Error("Adventure draft was not found.");
  }


  const userMessage =
    retryUserMessageId
      ? findRetryUserMessage(existingInterview.transcript, retryUserMessageId)
      : await repository.appendInterviewMessage({
          userId: input.userId,
          adventureId: input.adventureId,
          role: "user",
          content: answerText ?? "",
        });

  if (!retryUserMessageId) {
    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.INTERVIEW_ANSWER_PERSISTED,
        flow: "interview",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        userMessageId: userMessage.id,
        readinessStatus: existingInterview.draft.readinessStatus,
        interviewStatus: existingInterview.draft.interviewStatus,
      },
      "Interview answer persisted.",
    );
  }

  const transcriptWithAnswer =
    retryUserMessageId
      ? existingInterview.transcript
      : [...existingInterview.transcript, userMessage];

  const interviewerResult = await askGameMasterInterviewer(() =>
    dependencies.gameMasterInterviewer.askNextQuestion({
      userId: input.userId,
      adventureId: input.adventureId,
      goalText: existingInterview.draft.goalText,
      readinessStatus: existingInterview.draft.readinessStatus,
      interviewStatus: existingInterview.draft.interviewStatus,
      transcript: transcriptWithAnswer,
    }),
  );

  if (interviewerResult instanceof InterviewProviderFailure) {
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.INTERVIEW_TURN_RECOVERABLE_FAILURE,
        flow: "interview",
        result: "recoverable_failure",
        userId: input.userId,
        adventureId: input.adventureId,
        retryUserMessageId: userMessage.id,
        providerFailureCode: interviewerResult.code,
        durationMs: Date.now() - startedAt,
      },
      "Interview turn hit a recoverable provider failure.",
    );

    return {
      status: "recoverable_failure",
      draft: existingInterview.draft,
      transcript: transcriptWithAnswer,
      preservedUserMessage: userMessage,
      retryUserMessageId: userMessage.id,
      message: interviewerResult.userMessage,
    };
  }

  if (
    existingInterview.draft.interviewStatus === "awaiting_confirmation" &&
    interviewerResult.readinessConfirmation === "confirmed"
  ) {
    await repository.confirmReadiness({
      userId: input.userId,
      adventureId: input.adventureId,
    });

    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.INTERVIEW_CONFIRMED,
        flow: "interview",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        previousReadinessStatus: existingInterview.draft.readinessStatus,
        nextReadinessStatus: "ready_to_generate",
        previousInterviewStatus: existingInterview.draft.interviewStatus,
        nextInterviewStatus: "confirmed",
        durationMs: Date.now() - startedAt,
      },
      "Interview readiness confirmed.",
    );

    return {
      status: "success",
      draft: {
        ...existingInterview.draft,
        readinessStatus: "ready_to_generate",
        interviewStatus: "confirmed",
      },
      transcript: transcriptWithAnswer,
      userMessage,
    };
  }

  const gameMasterMessageText = normalizeRequiredInterviewText(
    "Game Master message",
    interviewerResult.messageToUser,
  );

  const gameMasterMessage = await repository.appendInterviewMessage({
    userId: input.userId,
    adventureId: input.adventureId,
    role: "game_master",
    content: gameMasterMessageText,
  });

  const interviewStatus = deriveInterviewStatusFromReadiness(
    interviewerResult.readinessStatus,
  );

  await repository.updateReadiness({
    userId: input.userId,
    adventureId: input.adventureId,
    readinessStatus: interviewerResult.readinessStatus,
    interviewStatus,
  });

  if (
    interviewerResult.readinessStatus !== existingInterview.draft.readinessStatus ||
    interviewStatus !== existingInterview.draft.interviewStatus
  ) {
    serverLogger.info(
      {
        event: APPLICATION_LOG_EVENTS.INTERVIEW_READINESS_CHANGED,
        flow: "interview",
        result: "success",
        userId: input.userId,
        adventureId: input.adventureId,
        previousReadinessStatus: existingInterview.draft.readinessStatus,
        nextReadinessStatus: interviewerResult.readinessStatus,
        previousInterviewStatus: existingInterview.draft.interviewStatus,
        nextInterviewStatus: interviewStatus,
      },
      "Interview readiness changed.",
    );
  }

  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.INTERVIEW_TURN_COMPLETED,
      flow: "interview",
      result: "success",
      userId: input.userId,
      adventureId: input.adventureId,
      retryUserMessageId,
      readinessStatus: interviewerResult.readinessStatus,
      interviewStatus,
      durationMs: Date.now() - startedAt,
    },
    "Interview turn completed.",
  );

  return {
    status: "success",
    draft: {
      ...existingInterview.draft,
      readinessStatus: interviewerResult.readinessStatus,
      interviewStatus,
    },
    transcript: [...transcriptWithAnswer, gameMasterMessage],
    userMessage,
    gameMasterMessage,
  };
}

function readAnswerText(input: AnswerInterviewQuestionInput): string {
  if ("answerText" in input && typeof input.answerText === "string") {
    return input.answerText;
  }

  throw new Error("Answer must not be blank.");
}

function readRetryUserMessageId(
  input: AnswerInterviewQuestionInput,
): string | null {
  return "retryUserMessageId" in input &&
    typeof input.retryUserMessageId === "string"
    ? input.retryUserMessageId
    : null;
}

function findRetryUserMessage(
  transcript: InterviewMessage[],
  retryUserMessageId: string,
): InterviewMessage {
  const userMessage = transcript.find(
    (message) => message.id === retryUserMessageId && message.role === "user",
  );

  if (!userMessage) {
    throw new Error("Saved answer was not found.");
  }

  return userMessage;
}

async function askGameMasterInterviewer<T>(
  ask: () => Promise<T>,
): Promise<T | InterviewProviderFailure> {
  try {
    return await ask();
  } catch (error) {
    const normalizedError = normalizeInterviewProviderFailure(error);

    if (normalizedError instanceof InterviewProviderFailure) {
      return normalizedError;
    }

    throw normalizedError;
  }
}
