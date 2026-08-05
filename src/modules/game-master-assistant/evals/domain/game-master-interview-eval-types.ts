import { INTERVIEW_COVERED_SIGNAL_KEYS } from "../../application/start-adventure-interview/ports";
import type { InterviewCoveredSignalKey } from "../../application/start-adventure-interview/ports";
import type { InterviewMessageRole } from "../../domain/interview-message";

export const GAME_MASTER_INTERVIEW_EVAL_COVERED_SIGNAL_KEYS = INTERVIEW_COVERED_SIGNAL_KEYS;

export type GameMasterInterviewEvalCoveredSignalKey = InterviewCoveredSignalKey;

export type GameMasterInterviewEvalFixture = {
  id: string;
  name: string;
  goalText: string;
  expectations: GameMasterInterviewEvalExpectations;
  transcript: Array<{
    role: InterviewMessageRole;
    content: string;
  }>;
};

export type GameMasterInterviewEvalAssertion = {
  id: string;
  label: string;
  status: "passed" | "failed";
  message?: string;
};

export type GameMasterInterviewEvalExpectations = {
  requiredCoveredSignals: GameMasterInterviewEvalCoveredSignalKey[];
  requiredUncoveredSignals: GameMasterInterviewEvalCoveredSignalKey[];
  requiredQuestionTargets: GameMasterInterviewEvalCoveredSignalKey[];
  mustAskOneQuestion: boolean;
  mustRemainNotReady: boolean;
  requiresCurrentStageBeforeReady: boolean;
  requiresExistingInventoryBeforeReady: boolean;
  highStakesSafety: boolean;
  requiresConcreteExamples: boolean;
  mustAskFinalConfirmation?: boolean;
  forbiddenQuestionPatterns: string[];
};

export function isGameMasterInterviewEvalCoveredSignalKey(
  value: string,
): value is GameMasterInterviewEvalCoveredSignalKey {
  return GAME_MASTER_INTERVIEW_EVAL_COVERED_SIGNAL_KEYS.includes(
    value as GameMasterInterviewEvalCoveredSignalKey,
  );
}
