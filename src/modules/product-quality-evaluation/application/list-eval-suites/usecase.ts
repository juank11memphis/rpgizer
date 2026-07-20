import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";

const EVAL_SUITES: EvalSuiteSummary[] = [
  {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Game Master",
    shortDescription: "Checks focused, useful interview turns.",
    purpose:
      "Checks whether the Game Master interview asks focused questions, keeps useful boundaries, and helps maintainers catch product-quality regressions before changes ship.",
  },
  {
    id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
    name: "Artifact",
    shortDescription: "Checks extracted interview output artifacts.",
    purpose:
      "Checks whether interview transcripts become grounded, useful Adventure creation inputs without losing goals, constraints, or safety boundaries.",
  },
  {
    id: GENERATE_ADVENTURE_EVAL_SUITE_ID,
    name: "Generate Adventure",
    shortDescription: "Checks full playable roadmap generation.",
    purpose:
      "Checks whether the Adventure generation pipeline turns interview context into coherent quests, milestones, inventory, dependencies, and XP balance.",
  },
  {
    id: ADVENTURE_CONTENT_EVAL_SUITE_ID,
    name: "Content",
    shortDescription: "Checks generated Adventure content quality.",
    purpose:
      "Checks whether focused Adventure content generation is specific, useful, RPG-native, and grounded in the selected Test Case context.",
  },
  {
    id: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
    name: "Dependency Links",
    shortDescription: "Checks prerequisite and unlock links.",
    purpose:
      "Checks whether generated Adventure dependency links connect quests, milestones, and inventory in a coherent progression structure.",
  },
  {
    id: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
    name: "XP Balance",
    shortDescription: "Checks skill progression and XP balance.",
    purpose:
      "Checks whether Adventure XP balancing produces practical skill progression without unrealistic or misleading rewards.",
  },
];

export function listEvalSuites(): EvalSuiteSummary[] {
  return EVAL_SUITES.map((suite) => ({ ...suite }));
}
