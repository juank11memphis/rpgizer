import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseGeneratedAdventureContent, type GeneratedAdventureContent } from "../domain/generated-adventure-content";
import {
  parseGeneratedAdventureDependencyLinks,
  type GeneratedAdventureDependencyLinks,
} from "../domain/generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "../domain/generated-adventure-xp";
import { checkAdventureXpQuality } from "./adventure-xp-quality-checks";
import {
  buildFailedResult,
  buildMissingTestCaseDiagnostic,
  buildPassedResult,
  buildRunnerDiagnostic,
  formatEvalError,
  formatFocusedProviderError,
  loadJsonFixtures,
  prepareFocusedAdventureStepRun,
  selectEvalFixtures,
  validateFocusedOpenAIConfiguration,
  type FocusedAdventureStepDiagnostic,
  type FocusedAdventureStepRunResult,
} from "./focused-adventure-step-eval-runner";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures/xp",
);

export type AdventureXpEvalFixture = {
  id: string;
  name: string;
  content: GeneratedAdventureContent;
  dependencies: GeneratedAdventureDependencyLinks;
};

export type AdventureXpEvalBalancer = {
  balanceAdventureXp(
    content: GeneratedAdventureContent,
    dependencies: GeneratedAdventureDependencyLinks,
    context?: { userId?: string; adventureId?: string },
  ): Promise<GeneratedAdventureXpBalance>;
};

export type AdventureXpEvalRunOptions = {
  fixturesDirectory?: string;
  testCaseId?: string;
  environment?: NodeJS.ProcessEnv;
  createBalancer?: () => Promise<AdventureXpEvalBalancer> | AdventureXpEvalBalancer;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureXpEvals(
  options: AdventureXpEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("xp", context.environment);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: AdventureXpEvalFixture[];
  let balancer: AdventureXpEvalBalancer;
  try {
    fixtures = selectEvalFixtures(
      await loadAdventureXpEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    balancer = await (options.createBalancer ?? createOpenAIAdventureXpBalancer)();
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];
  const assertionResults: FocusedAdventureStepRunResult["assertionResults"] = [];
  for (const fixture of fixtures) {
    try {
      const xpBalance = await balancer.balanceAdventureXp(fixture.content, fixture.dependencies, {
        userId: `eval-user-${fixture.id}`,
        adventureId: `eval-adventure-${fixture.id}`,
      });
      const qualityResult = checkAdventureXpQuality(fixture.content, fixture.dependencies, xpBalance);
      assertionResults.push({ fixtureId: fixture.id, assertions: qualityResult.assertions });
      diagnostics.push(
        ...qualityResult.diagnostics.map(
          (diagnostic) => ({ fixtureId: fixture.id, ...diagnostic }),
        ),
      );
    } catch (error) {
      diagnostics.push({
        fixtureId: fixture.id,
        area: "generation",
        message: formatFocusedProviderError("xp", error),
      });
    }
  }

  const fixtureIds = fixtures.map((fixture) => fixture.id);
  if (diagnostics.length > 0) {
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics, assertionResults);
  }

  return buildPassedResult(context.output, "Adventure XP balancing", fixtureIds, assertionResults);
}

export async function loadAdventureXpEvalFixtures(fixturesDirectory: string): Promise<AdventureXpEvalFixture[]> {
  return loadJsonFixtures(fixturesDirectory, parseAdventureXpEvalFixture);
}

export function parseAdventureXpEvalFixture(input: unknown, fixtureName = "fixture"): AdventureXpEvalFixture {
  const record = readRecord(input, `${fixtureName}: fixture must be an object.`);
  const content = parseGeneratedAdventureContent(record.content);

  return {
    id: readRequiredString(record, "id", fixtureName),
    name: readRequiredString(record, "name", fixtureName),
    content,
    dependencies: parseGeneratedAdventureDependencyLinks(record.dependencies, content),
  };
}

async function createOpenAIAdventureXpBalancer(): Promise<AdventureXpEvalBalancer> {
  const { OpenAIAdventureXpBalancer } = await import("../infra/openai-adventure-xp-balancer");
  return new OpenAIAdventureXpBalancer();
}

function readRequiredString(input: Record<string, unknown>, field: string, fixtureName: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fixtureName}: ${field} must be a non-empty string.`);
  }
  return value.trim();
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}

async function main(): Promise<void> {
  const result = await runAdventureXpEvals();
  if (!result.passed) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] === undefined ? "" : path.resolve(process.argv[1]);

if (invokedFilePath === currentFilePath) {
  void main();
}
