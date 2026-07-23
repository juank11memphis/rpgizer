import {
  cloneEvalSuiteSummary,
  cloneEvalSuiteTestCase,
  type EvalSuiteDefinition,
  type EvalSuiteReadyTestCase,
  type EvalSuiteSummary,
} from "../domain/eval-suite";
import { createAdventureContentSuite, createAdventureContentSuiteSummary } from "./adventure-content/suite";
import { createAdventureGenerationSuite, createAdventureGenerationSuiteSummary } from "./adventure-generation/suite";
import { createDependencyLinksSuite, createDependencyLinksSuiteSummary } from "./dependency-links/suite";
import { createInterviewSuite, createInterviewSuiteSummary } from "./interview/suite";
import { createInterviewArtifactSuite, createInterviewArtifactSuiteSummary } from "./interview-artifact/suite";
import { createXpBalanceSuite, createXpBalanceSuiteSummary } from "./xp-balance/suite";
import type { EvalSuiteModelEnvironment } from "./suite-model-defaults";
import type { FocusedAdventureStepRunResult } from "@/modules/adventure-planner/evals/focused-adventure-step-eval-runner";
import type { GenerateAdventureEvalRunResult } from "@/modules/adventure-planner/evals/run-generate-adventure-evals";
import type { GameMasterInterviewEvalRunResult } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";
import type { InterviewOutputArtifactEvalRunResult } from "@/modules/game-master-assistant/evals/run-interview-output-artifact-evals";

export type EvalSuiteRunnerInput = { testCaseId?: string; model?: string };

export type GameMasterInterviewEvalRunner = (input?: EvalSuiteRunnerInput) => Promise<GameMasterInterviewEvalRunResult>;
export type InterviewOutputArtifactEvalRunner = (input?: EvalSuiteRunnerInput) => Promise<InterviewOutputArtifactEvalRunResult>;
export type GenerateAdventureEvalRunner = (input?: EvalSuiteRunnerInput) => Promise<GenerateAdventureEvalRunResult>;
export type FocusedAdventureStepEvalRunner = (input?: EvalSuiteRunnerInput) => Promise<FocusedAdventureStepRunResult>;

export type EvalSuiteRegistryDependencies = {
  environment?: EvalSuiteModelEnvironment;
  runGameMasterInterviewEvals: GameMasterInterviewEvalRunner;
  runInterviewOutputArtifactEvals: InterviewOutputArtifactEvalRunner;
  runGenerateAdventureEvals: GenerateAdventureEvalRunner;
  runAdventureContentEvals: FocusedAdventureStepEvalRunner;
  runAdventureLinkingEvals: FocusedAdventureStepEvalRunner;
  runAdventureXpEvals: FocusedAdventureStepEvalRunner;
};

export function listRegisteredEvalSuiteSummaries(
  environment?: EvalSuiteModelEnvironment,
): EvalSuiteSummary[] {
  return buildSuiteSummaries(environment).map(cloneEvalSuiteSummary);
}

export function createEvalSuiteRegistry(dependencies: EvalSuiteRegistryDependencies): EvalSuiteDefinition[] {
  return [
    createInterviewSuite(dependencies.runGameMasterInterviewEvals, dependencies.environment),
    createInterviewArtifactSuite(dependencies.runInterviewOutputArtifactEvals, dependencies.environment),
    createAdventureContentSuite(dependencies.runAdventureContentEvals, dependencies.environment),
    createDependencyLinksSuite(dependencies.runAdventureLinkingEvals, dependencies.environment),
    createXpBalanceSuite(dependencies.runAdventureXpEvals, dependencies.environment),
    createAdventureGenerationSuite(dependencies.runGenerateAdventureEvals, dependencies.environment),
  ].map(cloneSuiteDefinition);
}

export function findRegisteredEvalSuite(
  suiteId: string,
  dependencies: EvalSuiteRegistryDependencies,
): EvalSuiteDefinition | undefined {
  return createEvalSuiteRegistry(dependencies).find((suite) => suite.id === suiteId);
}

function buildSuiteSummaries(environment?: EvalSuiteModelEnvironment): EvalSuiteSummary[] {
  return [
    createInterviewSuiteSummary(environment),
    createInterviewArtifactSuiteSummary(environment),
    createAdventureContentSuiteSummary(environment),
    createDependencyLinksSuiteSummary(environment),
    createXpBalanceSuiteSummary(environment),
    createAdventureGenerationSuiteSummary(environment),
  ];
}

function cloneSuiteDefinition(suite: EvalSuiteDefinition): EvalSuiteDefinition {
  return {
    ...suite,
    readyTestCases: suite.readyTestCases.map(cloneReadyTestCase),
    testCases: suite.testCases.map(cloneEvalSuiteTestCase),
    variants: suite.variants.map((variant) => ({ ...variant })),
    llmConfiguration: {
      ...suite.llmConfiguration,
      modelGroups: suite.llmConfiguration.modelGroups.map((group) => ({
        ...group,
        models: group.models.map((model) => ({ ...model })),
      })),
    },
  };
}

function cloneReadyTestCase(testCase: EvalSuiteReadyTestCase): EvalSuiteReadyTestCase {
  return {
    ...testCase,
    inputVariables: { ...testCase.inputVariables },
  };
}
