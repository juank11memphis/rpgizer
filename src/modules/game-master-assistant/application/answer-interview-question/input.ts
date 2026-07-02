export type AnswerInterviewQuestionInput = {
  userId: string;
  adventureId: string;
} & (
  | {
      answerText: string;
      retryUserMessageId?: never;
    }
  | {
      answerText?: never;
      retryUserMessageId: string;
    }
);
