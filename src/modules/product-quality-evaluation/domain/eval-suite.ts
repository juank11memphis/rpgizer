export const GAME_MASTER_INTERVIEW_EVAL_SUITE_ID = "game-master-interview";
export const INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID = "interview-output-artifact";
export const GENERATE_ADVENTURE_EVAL_SUITE_ID = "generate-adventure";
export const ADVENTURE_CONTENT_EVAL_SUITE_ID = "adventure-content";
export const ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID = "adventure-dependency-linking";
export const ADVENTURE_XP_BALANCING_EVAL_SUITE_ID = "adventure-xp-balancing";

export const EVAL_SUITE_IDS = [
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
] as const;

export type EvalSuiteId = (typeof EVAL_SUITE_IDS)[number];

export type EvalSuiteSummary = {
  id: EvalSuiteId;
  name: string;
  shortDescription: string;
  purpose: string;
};

export function isEvalSuiteId(suiteId: string): suiteId is EvalSuiteId {
  return EVAL_SUITE_IDS.includes(suiteId as EvalSuiteId);
}
