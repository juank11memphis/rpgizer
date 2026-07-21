import path from "node:path";

import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
import { checkGeneratedAdventureContentQuality } from "./adventure-content-quality-checks";
import type { GenerateAdventureEvalFixture } from "./generate-adventure-eval-types";
import {
  buildAdventureGeneratorRequest,
  loadGenerateAdventureEvalFixtures,
} from "./run-generate-adventure-evals";
import {
  buildFailedResult,
  buildMissingTestCaseDiagnostic,
  buildPassedResult,
  buildRunnerDiagnostic,
  formatEvalError,
  formatFocusedProviderError,
  prepareFocusedAdventureStepRun,
  selectEvalFixtures,
  validateFocusedOpenAIConfiguration,
  type FocusedAdventureStepDiagnostic,
  type FocusedAdventureStepRunResult,
} from "./focused-adventure-step-eval-runner";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures",
);

export type AdventureContentEvalGenerator = {
  generateAdventureContent(input: AdventureGeneratorRequest): Promise<GeneratedAdventureContent>;
};

export type AdventureContentEvalRunOptions = {
  fixturesDirectory?: string;
  testCaseId?: string;
  environment?: NodeJS.ProcessEnv;
  createGenerator?: () => Promise<AdventureContentEvalGenerator> | AdventureContentEvalGenerator;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureContentEvals(
  options: AdventureContentEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("content", context.environment);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: GenerateAdventureEvalFixture[];
  let generator: AdventureContentEvalGenerator;
  try {
    fixtures = selectEvalFixtures(
      await loadGenerateAdventureEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    generator = await (options.createGenerator ?? createOpenAIAdventureContentGenerator)();
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];
  const assertionResults: FocusedAdventureStepRunResult["assertionResults"] = [];

  for (const fixture of fixtures) {
    try {
      const content = await generator.generateAdventureContent(buildAdventureGeneratorRequest(fixture));
      const qualityResult = checkGeneratedAdventureContentQuality(content, fixture);
      assertionResults.push({ fixtureId: fixture.id, assertions: qualityResult.assertions });
      diagnostics.push(
        ...qualityResult.diagnostics.map((diagnostic) => ({
          fixtureId: fixture.id,
          ...diagnostic,
        })),
      );
    } catch (error) {
      diagnostics.push({
        fixtureId: fixture.id,
        area: "generation",
        message: formatFocusedProviderError("content", error),
      });
    }
  }

  const fixtureIds = fixtures.map((fixture) => fixture.id);
  if (diagnostics.length > 0) {
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics, assertionResults);
  }

  return buildPassedResult(context.output, "Adventure content", fixtureIds, assertionResults);
}

async function createOpenAIAdventureContentGenerator(): Promise<AdventureContentEvalGenerator> {
  const { OpenAIAdventureContentGenerator } = await import("../infra/openai-adventure-content-generator");
  return new OpenAIAdventureContentGenerator();
}

