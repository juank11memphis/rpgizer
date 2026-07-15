export const GAME_MASTER_INTERVIEW_EVAL_SUITE_ID = "game-master-interview";

export type EvalSuiteId = typeof GAME_MASTER_INTERVIEW_EVAL_SUITE_ID;

export type EvalSuiteSummary = {
  id: EvalSuiteId;
  name: string;
  shortDescription: string;
  purpose: string;
};
