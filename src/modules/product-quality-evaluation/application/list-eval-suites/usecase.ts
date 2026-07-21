import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  type EvalSuiteReadyTestCase,
  type EvalSuiteSummary,
} from "../../domain/eval-suite";

const defaultVariantFields = {
  defaultVariantLabel: "Default variant",
  defaultModelLabel: "Default model",
};

const gameMasterReadyTestCases: EvalSuiteReadyTestCase[] = [
  { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
  { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
  { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
  { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
];

const artifactReadyTestCases: EvalSuiteReadyTestCase[] = [
  { id: "become-a-confident-home-chef", name: "become-a-confident-home-chef", inputVariables: { fixtureId: "become-a-confident-home-chef" } },
  { id: "high-stakes-financial-stability", name: "high-stakes-financial-stability", inputVariables: { fixtureId: "high-stakes-financial-stability" } },
];

const adventureRequestReadyTestCases: EvalSuiteReadyTestCase[] = [
  { id: "learn-a-skill", name: "learn-a-skill", inputVariables: { goal: "Spanish coffee chat" } },
  { id: "build-a-product", name: "build-a-product", inputVariables: { goal: "Launch small product" } },
  { id: "fitness-habit", name: "fitness-habit", inputVariables: { goal: "Build fitness habit" } },
  { id: "high-stakes-boundary", name: "high-stakes-boundary", inputVariables: { goal: "High-stakes boundary" } },
];

const adventureFocusedReadyTestCases: EvalSuiteReadyTestCase[] = [
  { id: "spanish-coffee-chat", name: "spanish-coffee-chat", inputVariables: { fixtureId: "spanish-coffee-chat" } },
];

const EVAL_SUITES: EvalSuiteSummary[] = [
  {
    id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    name: "Interview",
    shortDescription: "Checks focused, useful interview turns.",
    purpose:
      "Checks whether the Game Master interview asks focused questions, keeps useful boundaries, and helps maintainers catch product-quality regressions before changes ship.",
    readyTestCases: gameMasterReadyTestCases,
    ...defaultVariantFields,
  },
  {
    id: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
    name: "Interview Artifact",
    shortDescription: "Checks extracted interview output artifacts.",
    purpose:
      "Checks whether interview transcripts become grounded, useful Adventure creation inputs without losing goals, constraints, or safety boundaries.",
    readyTestCases: artifactReadyTestCases,
    ...defaultVariantFields,
  },
  {
    id: ADVENTURE_CONTENT_EVAL_SUITE_ID,
    name: "Adventure Content",
    shortDescription: "Checks generated Adventure content quality.",
    purpose:
      "Checks whether focused Adventure content generation is specific, useful, RPG-native, and grounded in the selected Test Case context.",
    readyTestCases: adventureRequestReadyTestCases,
    ...defaultVariantFields,
  },
  {
    id: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
    name: "Dependency Links",
    shortDescription: "Checks prerequisite and unlock links.",
    purpose:
      "Checks whether generated Adventure dependency links connect quests, milestones, and inventory in a coherent progression structure.",
    readyTestCases: adventureFocusedReadyTestCases,
    ...defaultVariantFields,
  },
  {
    id: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
    name: "XP Balance",
    shortDescription: "Checks skill progression and XP balance.",
    purpose:
      "Checks whether Adventure XP balancing produces practical skill progression without unrealistic or misleading rewards.",
    readyTestCases: adventureFocusedReadyTestCases,
    ...defaultVariantFields,
  },
  {
    id: GENERATE_ADVENTURE_EVAL_SUITE_ID,
    name: "Adventure Generation",
    shortDescription: "Checks full playable roadmap generation.",
    purpose:
      "Checks whether the Adventure generation pipeline turns interview context into coherent quests, milestones, inventory, dependencies, and XP balance.",
    readyTestCases: adventureRequestReadyTestCases,
    ...defaultVariantFields,
  },
];

export function listEvalSuites(): EvalSuiteSummary[] {
  return EVAL_SUITES.map((suite) => ({
    ...suite,
    readyTestCases: suite.readyTestCases.map((testCase) => ({
      ...testCase,
      inputVariables: { ...testCase.inputVariables },
    })),
  }));
}
