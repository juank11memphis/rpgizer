import {
  cloneEvalSuiteSummary,
  cloneEvalSuiteTestCase,
  type EvalSuiteDefinition,
  type EvalSuiteReadyTestCase,
  type EvalSuiteSummary,
} from "../domain/eval-suite";
import { createAdventureContentSuite, adventureContentSuiteSummary } from "./adventure-content/suite";
import { createAdventureGenerationSuite, adventureGenerationSuiteSummary } from "./adventure-generation/suite";
import { createDependencyLinksSuite, dependencyLinksSuiteSummary } from "./dependency-links/suite";
import { createInterviewSuite, interviewSuiteSummary } from "./interview/suite";
import { createInterviewArtifactSuite, interviewArtifactSuiteSummary } from "./interview-artifact/suite";
import { createXpBalanceSuite, xpBalanceSuiteSummary } from "./xp-balance/suite";
import type { FocusedAdventureStepRunResult } from "@/modules/adventure-planner/evals/focused-adventure-step-eval-runner";
import type { GenerateAdventureEvalRunResult } from "@/modules/adventure-planner/evals/run-generate-adventure-evals";
import type { GameMasterInterviewEvalRunResult } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";
import type { InterviewOutputArtifactEvalRunResult } from "@/modules/game-master-assistant/evals/run-interview-output-artifact-evals";

export type GameMasterInterviewEvalRunner = (input?: { testCaseId?: string }) => Promise<GameMasterInterviewEvalRunResult>;
export type InterviewOutputArtifactEvalRunner = (input?: { testCaseId?: string }) => Promise<InterviewOutputArtifactEvalRunResult>;
export type GenerateAdventureEvalRunner = (input?: { testCaseId?: string }) => Promise<GenerateAdventureEvalRunResult>;
export type FocusedAdventureStepEvalRunner = (input?: { testCaseId?: string }) => Promise<FocusedAdventureStepRunResult>;

export type EvalSuiteRegistryDependencies = {
  runGameMasterInterviewEvals: GameMasterInterviewEvalRunner;
  runInterviewOutputArtifactEvals: InterviewOutputArtifactEvalRunner;
  runGenerateAdventureEvals: GenerateAdventureEvalRunner;
  runAdventureContentEvals: FocusedAdventureStepEvalRunner;
  runAdventureLinkingEvals: FocusedAdventureStepEvalRunner;
  runAdventureXpEvals: FocusedAdventureStepEvalRunner;
};

const SUITE_SUMMARIES: EvalSuiteSummary[] = [
  interviewSuiteSummary,
  interviewArtifactSuiteSummary,
  adventureContentSuiteSummary,
  dependencyLinksSuiteSummary,
  xpBalanceSuiteSummary,
  adventureGenerationSuiteSummary,
];

export function listRegisteredEvalSuiteSummaries(): EvalSuiteSummary[] {
  return SUITE_SUMMARIES.map(cloneEvalSuiteSummary);
}

export function createEvalSuiteRegistry(dependencies: EvalSuiteRegistryDependencies): EvalSuiteDefinition[] {
  return [
    createInterviewSuite(dependencies.runGameMasterInterviewEvals),
    createInterviewArtifactSuite(dependencies.runInterviewOutputArtifactEvals),
    createAdventureContentSuite(dependencies.runAdventureContentEvals),
    createDependencyLinksSuite(dependencies.runAdventureLinkingEvals),
    createXpBalanceSuite(dependencies.runAdventureXpEvals),
    createAdventureGenerationSuite(dependencies.runGenerateAdventureEvals),
  ].map(cloneSuiteDefinition);
}

export function findRegisteredEvalSuite(
  suiteId: string,
  dependencies: EvalSuiteRegistryDependencies,
): EvalSuiteDefinition | undefined {
  return createEvalSuiteRegistry(dependencies).find((suite) => suite.id === suiteId);
}

function cloneSuiteDefinition(suite: EvalSuiteDefinition): EvalSuiteDefinition {
  return {
    ...suite,
    readyTestCases: suite.readyTestCases.map(cloneReadyTestCase),
    testCases: suite.testCases.map(cloneEvalSuiteTestCase),
    variants: suite.variants.map((variant) => ({ ...variant })),
  };
}

function cloneReadyTestCase(testCase: EvalSuiteReadyTestCase): EvalSuiteReadyTestCase {
  return {
    ...testCase,
    inputVariables: { ...testCase.inputVariables },
  };
}
