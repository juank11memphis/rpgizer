import type { AdventureInterviewDraft } from "../get-adventure-interview/output";
import type { InterviewMessage } from "../../domain/interview-message";

export type AnswerInterviewQuestionSuccess = {
  status: "success";
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  userMessage: InterviewMessage;
  gameMasterMessage: InterviewMessage;
};

export type AnswerInterviewQuestionRecoverableFailure = {
  status: "recoverable_failure";
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  preservedUserMessage: InterviewMessage;
  retryUserMessageId: string;
  message: string;
};

export type AnswerInterviewQuestionOutput =
  | AnswerInterviewQuestionSuccess
  | AnswerInterviewQuestionRecoverableFailure;
