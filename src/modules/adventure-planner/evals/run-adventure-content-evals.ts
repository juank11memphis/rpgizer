import path from "node:path";
import { fileURLToPath } from "node:url";

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
  buildPassedResult,
  buildRunnerDiagnostic,
  formatEvalError,
  formatFocusedProviderError,
  prepareFocusedAdventureStepRun,
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
    fixtures = await loadGenerateAdventureEvalFixtures(
      options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY,
    );
    generator = await (options.createGenerator ?? createOpenAIAdventureContentGenerator)();
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];

  for (const fixture of fixtures) {
    try {
      const content = await generator.generateAdventureContent(buildAdventureGeneratorRequest(fixture));
      diagnostics.push(
        ...checkGeneratedAdventureContentQuality(content, fixture).diagnostics.map((diagnostic) => ({
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
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics);
  }

  return buildPassedResult(context.output, "Adventure content", fixtureIds);
}

async function createOpenAIAdventureContentGenerator(): Promise<AdventureContentEvalGenerator> {
  const { OpenAIAdventureContentGenerator } = await import("../infra/openai-adventure-content-generator");
  return new OpenAIAdventureContentGenerator();
}

async function main(): Promise<void> {
  const result = await runAdventureContentEvals();
  if (!result.passed) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] === undefined ? "" : path.resolve(process.argv[1]);

if (invokedFilePath === currentFilePath) {
  void main();
}
