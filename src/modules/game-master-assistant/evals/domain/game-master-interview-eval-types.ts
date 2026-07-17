import type { InterviewMessageRole } from "../../domain/interview-message";

export const GAME_MASTER_INTERVIEW_EVAL_COVERED_SIGNAL_KEYS = [
  "motivation",
  "successDefinition",
  "currentStage",
  "pastFriction",
  "constraints",
  "existingInventory",
  "likelyMissingResources",
  "safetyBoundary",
] as const;

export type GameMasterInterviewEvalCoveredSignalKey =
  (typeof GAME_MASTER_INTERVIEW_EVAL_COVERED_SIGNAL_KEYS)[number];

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
  forbiddenQuestionPatterns: string[];
};

export function isGameMasterInterviewEvalCoveredSignalKey(
  value: string,
): value is GameMasterInterviewEvalCoveredSignalKey {
  return GAME_MASTER_INTERVIEW_EVAL_COVERED_SIGNAL_KEYS.includes(
    value as GameMasterInterviewEvalCoveredSignalKey,
  );
}
