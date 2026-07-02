import { normalizeRequiredInterviewText } from "../../domain/interview-message";
import { deriveInterviewStatusFromReadiness } from "../../domain/interview-status";
import type { InterviewMessage } from "../../domain/interview-message";
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
