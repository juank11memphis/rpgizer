import type { AdventureInterviewDraft } from "../get-adventure-interview/output";
import type { InterviewMessage } from "../../domain/interview-message";

export type AnswerInterviewQuestionOutput = {
  draft: AdventureInterviewDraft;
  transcript: InterviewMessage[];
  userMessage: InterviewMessage;
  gameMasterMessage: InterviewMessage;
};
