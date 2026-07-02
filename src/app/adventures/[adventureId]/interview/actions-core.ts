import type { AnswerInterviewQuestionInput } from "@/modules/game-master-assistant/application/answer-interview-question/input";
import type { AnswerInterviewQuestionOutput } from "@/modules/game-master-assistant/application/answer-interview-question/output";
import { INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE } from "@/modules/game-master-assistant/application/start-adventure-interview/provider-error";
import type { AdventureInterviewDraft } from "@/modules/game-master-assistant/application/get-adventure-interview/output";
import type { InterviewMessage } from "@/modules/game-master-assistant/domain/interview-message";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";

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
};

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

    if (!adventureId) {
      throw new Error("Adventure id is required.");
    }

    if (!answerText && !retryUserMessageId) {
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
      dependencies.redirectTo(
        `/login?next=${encodeURIComponent(`/adventures/${adventureId}/interview`)}`,
      );
    }

    const result = await dependencies.answerInterviewQuestion(
      retryUserMessageId
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
