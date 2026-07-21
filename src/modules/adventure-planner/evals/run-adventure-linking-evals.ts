import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseGeneratedAdventureContent, type GeneratedAdventureContent } from "../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import { checkAdventureLinkingQuality } from "./adventure-linking-quality-checks";
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
  "src/modules/adventure-planner/evals/fixtures/linking",
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
  environment?: NodeJS.ProcessEnv;
  createLinker?: () => Promise<AdventureLinkingEvalLinker> | AdventureLinkingEvalLinker;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export async function runAdventureLinkingEvals(
  options: AdventureLinkingEvalRunOptions = {},
): Promise<FocusedAdventureStepRunResult> {
  const context = prepareFocusedAdventureStepRun(options);
  const configurationError = validateFocusedOpenAIConfiguration("linking", context.environment);
  if (configurationError !== null) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", configurationError)]);
  }

  let fixtures: AdventureLinkingEvalFixture[];
  let linker: AdventureLinkingEvalLinker;
  try {
    fixtures = selectEvalFixtures(
      await loadAdventureLinkingEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      return buildFailedResult(context.errorOutput, [], [buildMissingTestCaseDiagnostic(options.testCaseId)]);
    }
    linker = await (options.createLinker ?? createOpenAIAdventureDependencyLinker)();
  } catch (error) {
    return buildFailedResult(context.errorOutput, [], [buildRunnerDiagnostic("configuration", formatEvalError(error))]);
  }

  const diagnostics: FocusedAdventureStepDiagnostic[] = [];
  for (const fixture of fixtures) {
    try {
      const links = await linker.linkAdventureDependencies(fixture.content, {
        userId: `eval-user-${fixture.id}`,
        adventureId: `eval-adventure-${fixture.id}`,
      });
      diagnostics.push(
        ...checkAdventureLinkingQuality(fixture.content, links, fixture.expectations).diagnostics.map(
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
    return buildFailedResult(context.errorOutput, fixtureIds, diagnostics);
  }

  return buildPassedResult(context.output, "Adventure dependency linking", fixtureIds);
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

async function createOpenAIAdventureDependencyLinker(): Promise<AdventureLinkingEvalLinker> {
  const { OpenAIAdventureDependencyLinker } = await import("../infra/openai-adventure-dependency-linker");
  return new OpenAIAdventureDependencyLinker();
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

async function main(): Promise<void> {
  const result = await runAdventureLinkingEvals();
  if (!result.passed) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] === undefined ? "" : path.resolve(process.argv[1]);

if (invokedFilePath === currentFilePath) {
  void main();
}
