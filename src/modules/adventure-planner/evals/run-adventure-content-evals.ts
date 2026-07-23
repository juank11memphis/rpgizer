import { readFile } from "node:fs/promises";
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
  buildRawEvalArtifacts,
  buildRunnerDiagnostic,
  buildFocusedOpenAIConfig,
  formatEvalError,
  formatFocusedProviderError,
  prepareFocusedAdventureStepRun,
  selectEvalFixtures,
  validateFocusedOpenAIConfiguration,
  type FocusedAdventureStepDiagnostic,
  type FocusedAdventureStepRunResult,
  type FocusedAdventureStepCellOutput,
} from "./focused-adventure-step-eval-runner";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures",
);
const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/generate-adventure-content.md",
);

export type AdventureContentEvalGenerator = {
  generateAdventureContent(input: AdventureGeneratorRequest): Promise<GeneratedAdventureContent>;
};

export type AdventureContentEvalRunOptions = {
  fixturesDirectory?: string;
  testCaseId?: string;
  model?: string;
  environment?: NodeJS.ProcessEnv;
  createGenerator?: () => Promise<AdventureContentEvalGenerator> | AdventureContentEvalGenerator;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureContentEvals(
  options: AdventureContentEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("content", context.environment, options.model);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: GenerateAdventureEvalFixture[];
  let generator: AdventureContentEvalGenerator;
  let prompt: string;
  try {
    fixtures = selectEvalFixtures(
      await loadGenerateAdventureEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    [generator, prompt] = await Promise.all([
      options.createGenerator
        ? Promise.resolve(options.createGenerator())
        : createOpenAIAdventureContentGenerator(context.environment, options.model),
      readFile(PROMPT_PATH, "utf8"),
    ]);
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];
  const assertionResults: FocusedAdventureStepRunResult["assertionResults"] = [];
  const cellOutputs: FocusedAdventureStepCellOutput[] = [];

  for (const fixture of fixtures) {
    try {
      const request = buildAdventureGeneratorRequest(fixture);
      const content = await generator.generateAdventureContent(request);
      const qualityResult = checkGeneratedAdventureContentQuality(content, fixture);
      assertionResults.push({ fixtureId: fixture.id, assertions: qualityResult.assertions });
      cellOutputs.push(buildContentCellOutput(fixture, request, content, prompt));
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
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics, assertionResults, cellOutputs);
  }

  return buildPassedResult(context.output, "Adventure content", fixtureIds, assertionResults, cellOutputs);
}

async function createOpenAIAdventureContentGenerator(
  environment: NodeJS.ProcessEnv,
  model?: string,
): Promise<AdventureContentEvalGenerator> {
  const { OpenAIAdventureContentGenerator } = await import("../infra/openai-adventure-content-generator");
  return new OpenAIAdventureContentGenerator({
    config: buildFocusedOpenAIConfig("content", environment, model),
  });
}

function buildContentCellOutput(
  fixture: GenerateAdventureEvalFixture,
  request: AdventureGeneratorRequest,
  content: GeneratedAdventureContent,
  prompt: string,
): FocusedAdventureStepCellOutput {
  const outputMarkdown = JSON.stringify(content, null, 2);

  return {
    fixtureId: fixture.id,
    outputMarkdown,
    outputPreview: content.title,
    artifacts: buildRawEvalArtifacts({
      prompt,
      request,
      response: content,
      expected: fixture.expectations,
    }),
  };
}
