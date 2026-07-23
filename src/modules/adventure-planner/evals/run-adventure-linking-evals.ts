import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseGeneratedAdventureContent, type GeneratedAdventureContent } from "../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import { checkAdventureLinkingQuality } from "./adventure-linking-quality-checks";
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
  "src/modules/adventure-planner/evals/fixtures/linking",
);
const PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/link-adventure-dependencies.md",
);

export type AdventureLinkingEvalFixture = {
  id: string;
  name: string;
  content: GeneratedAdventureContent;
  expectations: { expectedInventoryCoverage: string[] };
};

export type AdventureLinkingEvalLinker = {
  linkAdventureDependencies(content: GeneratedAdventureContent, context?: { userId?: string; adventureId?: string }): Promise<GeneratedAdventureDependencyLinks>;
};

export type AdventureLinkingEvalRunOptions = {
  fixturesDirectory?: string;
  testCaseId?: string;
  model?: string;
  environment?: NodeJS.ProcessEnv;
  createLinker?: () => Promise<AdventureLinkingEvalLinker> | AdventureLinkingEvalLinker;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureLinkingEvals(
  options: AdventureLinkingEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("linking", context.environment, options.model);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: AdventureLinkingEvalFixture[];
  let linker: AdventureLinkingEvalLinker;
  let prompt: string;
  try {
    fixtures = selectEvalFixtures(
      await loadAdventureLinkingEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    [linker, prompt] = await Promise.all([
      options.createLinker
        ? Promise.resolve(options.createLinker())
        : createOpenAIAdventureDependencyLinker(context.environment, options.model),
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
      const request = buildLinkingRequest(fixture);
      const links = await linker.linkAdventureDependencies(request.content, request.context);
      const qualityResult = checkAdventureLinkingQuality(fixture.content, links, fixture.expectations);
      assertionResults.push({ fixtureId: fixture.id, assertions: qualityResult.assertions });
      cellOutputs.push(buildLinkingCellOutput(fixture, request, links, prompt));
      diagnostics.push(
        ...qualityResult.diagnostics.map(
          (diagnostic) => ({ fixtureId: fixture.id, ...diagnostic }),
        ),
      );
    } catch (error) {
      diagnostics.push({
        fixtureId: fixture.id,
        area: "generation",
        message: formatFocusedProviderError("linking", error),
      });
    }
  }

  const fixtureIds = fixtures.map((fixture) => fixture.id);
  if (diagnostics.length > 0) {
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics, assertionResults, cellOutputs);
  }

  return buildPassedResult(context.output, "Adventure dependency linking", fixtureIds, assertionResults, cellOutputs);
}

export async function loadAdventureLinkingEvalFixtures(
  fixturesDirectory: string,
): Promise<AdventureLinkingEvalFixture[]> {
  return loadJsonFixtures(fixturesDirectory, parseAdventureLinkingEvalFixture);
}

export function parseAdventureLinkingEvalFixture(
  input: unknown,
  fixtureName = "fixture",
): AdventureLinkingEvalFixture {
  const record = readRecord(input, `${fixtureName}: fixture must be an object.`);
  const expectations = readOptionalRecord(record.expectations);

  return {
    id: readRequiredString(record, "id", fixtureName),
    name: readRequiredString(record, "name", fixtureName),
    content: parseGeneratedAdventureContent(record.content),
    expectations: {
      expectedInventoryCoverage: readStringArray(expectations.expectedInventoryCoverage, fixtureName, "expectedInventoryCoverage"),
    },
  };
}

async function createOpenAIAdventureDependencyLinker(
  environment: NodeJS.ProcessEnv,
  model?: string,
): Promise<AdventureLinkingEvalLinker> {
  const { OpenAIAdventureDependencyLinker } = await import("../infra/openai-adventure-dependency-linker");
  return new OpenAIAdventureDependencyLinker({
    config: buildFocusedOpenAIConfig("linking", environment, model),
  });
}

function buildLinkingRequest(fixture: AdventureLinkingEvalFixture): {
  content: GeneratedAdventureContent;
  context: { userId: string; adventureId: string };
} {
  return {
    content: fixture.content,
    context: {
      userId: `eval-user-${fixture.id}`,
      adventureId: `eval-adventure-${fixture.id}`,
    },
  };
}

function buildLinkingCellOutput(
  fixture: AdventureLinkingEvalFixture,
  request: ReturnType<typeof buildLinkingRequest>,
  links: GeneratedAdventureDependencyLinks,
  prompt: string,
): FocusedAdventureStepCellOutput {
  const outputMarkdown = JSON.stringify(links, null, 2);

  return {
    fixtureId: fixture.id,
    outputMarkdown,
    outputPreview: `${links.questLinks.length + links.bossFightLinks.length} dependency links`,
    artifacts: buildRawEvalArtifacts({
      prompt,
      request,
      response: links,
      expected: fixture.expectations,
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

function readStringArray(input: unknown, fixtureName: string, field: string): string[] {
  if (input === undefined) {
    return [];
  }
  if (!Array.isArray(input)) {
    throw new Error(`${fixtureName}: ${field} must be an array.`);
  }
  return input.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${fixtureName}: ${field}[${index}] must be a non-empty string.`);
    }
    return item.trim();
  });
}

function readOptionalRecord(input: unknown): Record<string, unknown> {
  if (input === undefined) {
    return {};
  }
  return readRecord(input, "fixture expectations must be an object.");
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }
  return input as Record<string, unknown>;
}
