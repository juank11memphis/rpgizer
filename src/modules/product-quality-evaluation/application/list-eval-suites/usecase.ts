import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";

const GAME_MASTER_INTERVIEW_SUITE: EvalSuiteSummary = {
  id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  name: "Game Master Interview",
  shortDescription: "Checks focused, useful interview turns.",
  purpose:
    "Checks whether the Game Master interview asks focused questions, keeps useful boundaries, and helps maintainers catch product-quality regressions before changes ship.",
};

export function listEvalSuites(): EvalSuiteSummary[] {
  return [GAME_MASTER_INTERVIEW_SUITE];
}
