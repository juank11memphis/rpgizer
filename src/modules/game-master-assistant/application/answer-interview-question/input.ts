export type AnswerInterviewQuestionSubmissionIntent = "answer" | "confirm_readiness";

export type AnswerInterviewQuestionInput = {
  userId: string;
  adventureId: string;
} & (
  | {
      submissionIntent?: "answer";
      answerText: string;
      retryUserMessageId?: never;
    }
  | {
      submissionIntent: "confirm_readiness";
      answerText?: never;
      retryUserMessageId?: never;
    }
  | {
      submissionIntent?: "answer";
      answerText?: never;
      retryUserMessageId: string;
    }
);
