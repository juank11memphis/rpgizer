import { readFile } from "node:fs/promises";
import path from "node:path";

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
  buildRawEvalArtifacts,
  buildRunnerDiagnostic,
  buildFocusedOpenAIConfig,
  formatEvalError,
  formatFocusedProviderError,
  loadJsonFixtures,
  prepareFocusedAdventureStepRun,
  selectEvalFixtures,
  validateFocusedOpenAIConfiguration,
  type FocusedAdventureStepDiagnostic,
  type FocusedAdventureStepRunResult,
  type FocusedAdventureStepCellOutput,
} from "./focused-adventure-step-eval-runner";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures/xp",
);
const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/balance-adventure-xp.md",
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
  model?: string;
  environment?: NodeJS.ProcessEnv;
  createBalancer?: () => Promise<AdventureXpEvalBalancer> | AdventureXpEvalBalancer;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureXpEvals(
  options: AdventureXpEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("xp", context.environment, options.model);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: AdventureXpEvalFixture[];
  let balancer: AdventureXpEvalBalancer;
  let prompt: string;
  try {
    fixtures = selectEvalFixtures(
      await loadAdventureXpEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    [balancer, prompt] = await Promise.all([
      options.createBalancer
        ? Promise.resolve(options.createBalancer())
        : createOpenAIAdventureXpBalancer(context.environment, options.model),
      readFile(PROMPT_PATH, "utf8"),
    ]);
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];
  const assertionResults: FocusedAdventureStepRunResult["assertionResults"] = [];
  const cellOutputs: FocusedAdventureStepRunResult["cellOutputs"] = [];
  for (const fixture of fixtures) {
    try {
      const request = buildXpRequest(fixture);
      const xpBalance = await balancer.balanceAdventureXp(request.content, request.dependencies, request.context);
      const qualityResult = checkAdventureXpQuality(fixture.content, fixture.dependencies, xpBalance);
      assertionResults.push({ fixtureId: fixture.id, assertions: qualityResult.assertions });
      cellOutputs.push(buildXpCellOutput(fixture, request, xpBalance, prompt));
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
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics, assertionResults, cellOutputs);
  }

  return buildPassedResult(context.output, "Adventure XP balancing", fixtureIds, assertionResults, cellOutputs);
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

async function createOpenAIAdventureXpBalancer(
  environment: NodeJS.ProcessEnv,
  model?: string,
): Promise<AdventureXpEvalBalancer> {
  const { OpenAIAdventureXpBalancer } = await import("../infra/openai-adventure-xp-balancer");
  return new OpenAIAdventureXpBalancer({
    config: buildFocusedOpenAIConfig("xp", environment, model),
  });
}

function buildXpRequest(fixture: AdventureXpEvalFixture): {
  content: GeneratedAdventureContent;
  dependencies: GeneratedAdventureDependencyLinks;
  context: { userId: string; adventureId: string };
} {
  return {
    content: fixture.content,
    dependencies: fixture.dependencies,
    context: {
      userId: `eval-user-${fixture.id}`,
      adventureId: `eval-adventure-${fixture.id}`,
    },
  };
}

function buildXpCellOutput(
  fixture: AdventureXpEvalFixture,
  request: ReturnType<typeof buildXpRequest>,
  xpBalance: GeneratedAdventureXpBalance,
  prompt: string,
): FocusedAdventureStepCellOutput {
  const outputMarkdown = JSON.stringify(xpBalance, null, 2);

  return {
    fixtureId: fixture.id,
    outputMarkdown,
    outputPreview: `${xpBalance.questXp.length + xpBalance.bossFightXp.length} XP rewards`,
    artifacts: buildRawEvalArtifacts({
      prompt,
      request,
      response: xpBalance,
      expected: "No fixture-specific golden payload; this suite's assertions define expected XP quality.",
    }),
  };
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
