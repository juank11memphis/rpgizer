import type { AnswerInterviewQuestionInput } from "@/modules/game-master-assistant/application/answer-interview-question/input";
import type { AnswerInterviewQuestionOutput } from "@/modules/game-master-assistant/application/answer-interview-question/output";
import { INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE } from "@/modules/game-master-assistant/application/start-adventure-interview/provider-error";
import type { AdventureInterviewDraft } from "@/modules/game-master-assistant/application/get-adventure-interview/output";
import type { InterviewMessage } from "@/modules/game-master-assistant/domain/interview-message";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";
import { serverLogger } from "@/server/logging/logger";

export const EMPTY_ANSWER_MESSAGE = "Tell me your answer first.";
export const INTERVIEW_SAVE_FAILURE_MESSAGE =
  INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE;

export type InterviewAnswerFormState = {
  status: "idle" | "field_error" | "form_error" | "success" | "recoverable_failure";
  answerText: string;
  fieldError: string | null;
  formError: string | null;
  draft: AdventureInterviewDraft | null;
  transcript: InterviewMessage[] | null;
  retryUserMessageId: string | null;
};

export type SubmitInterviewAnswerAction = (
  previousState: InterviewAnswerFormState,
  formData: FormData,
) => Promise<InterviewAnswerFormState>;

export const initialInterviewAnswerFormState: InterviewAnswerFormState = {
  status: "idle",
  answerText: "",
  fieldError: null,
  formError: null,
  draft: null,
  transcript: null,
  retryUserMessageId: null,
};

type AnswerInterviewQuestion = (
  input: AnswerInterviewQuestionInput,
) => Promise<AnswerInterviewQuestionOutput>;

type SubmitInterviewAnswerDependencies = {
  requireCurrentUser: () => Promise<RequireCurrentUserResult>;
  answerInterviewQuestion: AnswerInterviewQuestion;
  redirectTo: (destination: string) => never;
  logger?: ServerActionLogger;
};

type ServerActionLogger = Pick<typeof serverLogger, "info" | "warn">;

export function createSubmitInterviewAnswerAction(
  dependencies: SubmitInterviewAnswerDependencies,
): SubmitInterviewAnswerAction {
  return async function submitInterviewAnswer(
    previousState: InterviewAnswerFormState,
    formData: FormData,
  ): Promise<InterviewAnswerFormState> {
    const adventureId = readRequiredString(formData, "adventureId");
    const answerText = readString(formData, "answerText").trim();
    const retryUserMessageId = readString(formData, "retryUserMessageId").trim();
    const logger = dependencies.logger ?? serverLogger;

    if (!adventureId) {
      throw new Error("Adventure id is required.");
    }

    if (!answerText && !retryUserMessageId) {
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_VALIDATION_FAILED,
        flow: "interview",
        action: "interview_answer",
        result: "validation_failed",
        adventureId,
        validationField: "answerText",
        validationCategory: "empty",
      });

      return {
        ...previousState,
        status: "field_error",
        answerText: "",
        fieldError: EMPTY_ANSWER_MESSAGE,
        formError: null,
      };
    }

    const currentUser = await dependencies.requireCurrentUser();

    if (currentUser.status === "unauthenticated") {
      const redirectDestination = `/login?next=${encodeURIComponent(`/adventures/${adventureId}/interview`)}`;
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_UNAUTHENTICATED_REDIRECT,
        flow: "interview",
        action: "interview_answer",
        result: "unauthenticated_redirect",
        adventureId,
        redirectCategory: "login_required",
        redirectDestination,
      });
      dependencies.redirectTo(
        redirectDestination,
      );
    }

    const isRetry = Boolean(retryUserMessageId);
    const result = await dependencies.answerInterviewQuestion(
      isRetry
        ? {
            userId: currentUser.user.id,
            adventureId,
            retryUserMessageId,
          }
        : {
            userId: currentUser.user.id,
            adventureId,
            answerText,
          },
    );

    if (result.status === "expected_error") {
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_EXPECTED_ERROR,
        flow: "interview",
        action: "interview_answer",
        result: "expected_error",
        userId: currentUser.user.id,
        adventureId,
        mode: isRetry ? "retry" : "answer",
        draftReadinessStatus: result.draft.readinessStatus,
        draftInterviewStatus: result.draft.interviewStatus,
      });

      return {
        status: "form_error",
        answerText,
        fieldError: null,
        formError: result.message,
        draft: result.draft,
        transcript: result.transcript,
        retryUserMessageId: null,
      };
    }

    if (result.status === "recoverable_failure") {
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_RECOVERABLE_FAILURE,
        flow: "interview",
        action: "interview_answer",
        result: "recoverable_failure",
        userId: currentUser.user.id,
        adventureId,
        mode: isRetry ? "retry" : "answer",
        retryUserMessageId: result.retryUserMessageId,
        draftReadinessStatus: result.draft.readinessStatus,
        draftInterviewStatus: result.draft.interviewStatus,
      });

      return {
        status: "recoverable_failure",
        answerText: "",
        fieldError: null,
        formError: INTERVIEW_SAVE_FAILURE_MESSAGE,
        draft: result.draft,
        transcript: result.transcript,
        retryUserMessageId: result.retryUserMessageId,
      };
    }

    logger.info({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_INTERVIEW_ANSWER_SUCCESS,
      flow: "interview",
      action: "interview_answer",
      result: "success",
      userId: currentUser.user.id,
      adventureId,
      mode: isRetry ? "retry" : "answer",
      draftReadinessStatus: result.draft.readinessStatus,
      draftInterviewStatus: result.draft.interviewStatus,
    });

    return {
      status: "success",
      answerText: "",
      fieldError: null,
      formError: null,
      draft: result.draft,
      transcript: result.transcript,
      retryUserMessageId: null,
    };
  };
}

function readRequiredString(formData: FormData, name: string): string {
  const value = readString(formData, name).trim();

  return value;
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
