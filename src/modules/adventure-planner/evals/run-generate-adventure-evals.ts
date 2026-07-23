import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import type { GeneratedAdventure } from "../domain/generated-adventure";
import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { serverLogger } from "../../../server/logging/logger";
import { serializeErrorForLog } from "../../../server/logging/redaction";
import {
  loadOpenAIAdventureContentConfig,
  loadOpenAIAdventureDependencyLinkerConfig,
  loadOpenAIAdventureGenerationConfig,
  loadOpenAIAdventureXpBalancerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";
import { checkGeneratedAdventureQuality } from "./adventure-quality-checks";
import {
  buildMissingTestCaseDiagnostic,
  buildRawEvalArtifacts,
  selectEvalFixtures,
  type FocusedAdventureStepCellOutput,
} from "./focused-adventure-step-eval-runner";
import { parseGenerateAdventureEvalFixture } from "./generate-adventure-eval-fixture-parser";
import type {
  AdventureQualityAssertionOutcome,
  AdventureQualityDiagnostic,
  GenerateAdventureEvalFixture,
} from "./generate-adventure-eval-types";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures",
);
const EVAL_CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

export type GenerateAdventureEvalGenerator = {
  generateAdventure(input: AdventureGeneratorRequest): Promise<GeneratedAdventure>;
};

export type GenerateAdventureEvalRunOptions = {
  fixturesDirectory?: string;
  testCaseId?: string;
  environment?: NodeJS.ProcessEnv;
  createGenerator?: () => Promise<GenerateAdventureEvalGenerator> | GenerateAdventureEvalGenerator;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export type GenerateAdventureEvalRunResult = {
  passed: boolean;
  fixtureIds: string[];
  diagnostics: GenerateAdventureEvalFailureDiagnostic[];
  assertionResults: GenerateAdventureEvalAssertionResult[];
  cellOutputs: FocusedAdventureStepCellOutput[];
};

export type GenerateAdventureEvalAssertionResult = {
  fixtureId: string;
  assertions: AdventureQualityAssertionOutcome[];
};

export type GenerateAdventureEvalFailureDiagnostic = AdventureQualityDiagnostic & {
  fixtureId: string;
};

export async function runGenerateAdventureEvals(
  options: GenerateAdventureEvalRunOptions = {},
): Promise<GenerateAdventureEvalRunResult> {
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;
  loadNextEnvironmentWhenUsingProcessEnv(options.environment);
  const environment = options.environment ?? process.env;

  const configurationError = validateOpenAIConfiguration(environment);
  if (configurationError !== null) {
    const diagnostic = buildRunDiagnostic("configuration", configurationError);
    writeDiagnostic(errorOutput, diagnostic);
    return { passed: false, fixtureIds: [], diagnostics: [diagnostic], assertionResults: [], cellOutputs: [] };
  }

  let fixtures: GenerateAdventureEvalFixture[];
  let generator: GenerateAdventureEvalGenerator;

  try {
    fixtures = selectEvalFixtures(
      await loadGenerateAdventureEvalFixtures(options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY),
      options.testCaseId,
    );
    if (fixtures.length === 0 && options.testCaseId) {
      const diagnostic = buildMissingTestCaseDiagnostic(options.testCaseId);
      writeDiagnostic(errorOutput, diagnostic);
      return { passed: false, fixtureIds: [], diagnostics: [diagnostic], assertionResults: [], cellOutputs: [] };
    }
    generator = await (options.createGenerator ?? createProductionAdventureGenerator)();
  } catch (error) {
    const diagnostic = buildRunDiagnostic("configuration", formatEvalError(error));
    writeDiagnostic(errorOutput, diagnostic);
    return { passed: false, fixtureIds: [], diagnostics: [diagnostic], assertionResults: [], cellOutputs: [] };
  }

  const diagnostics: GenerateAdventureEvalFailureDiagnostic[] = [];
  const assertionResults: GenerateAdventureEvalAssertionResult[] = [];
  const cellOutputs: FocusedAdventureStepCellOutput[] = [];
  logEvalStarted(fixtures.map((fixture) => fixture.id));

  for (const fixture of fixtures) {
    const request = buildAdventureGeneratorRequest(fixture);
    try {
      const adventure = await generator.generateAdventure(request);
      const result = checkGeneratedAdventureQuality(adventure, fixture);

      assertionResults.push({ fixtureId: fixture.id, assertions: result.assertions });
      cellOutputs.push(buildGenerateAdventureCellOutput(fixture, request, adventure));
      diagnostics.push(
        ...result.diagnostics.map((diagnostic) => ({ fixtureId: fixture.id, ...diagnostic })),
      );
    } catch (error) {
      diagnostics.push({
        fixtureId: fixture.id,
        area: classifyGenerationFailureArea(error),
        message: formatGenerationError(error),
      });
    }
  }

  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      writeDiagnostic(errorOutput, diagnostic);
    }

    logEvalCompleted("failure", fixtures.map((fixture) => fixture.id), diagnostics);

    return {
      passed: false,
      fixtureIds: fixtures.map((fixture) => fixture.id),
      diagnostics,
      assertionResults,
      cellOutputs,
    };
  }

  output.write(`Generate Adventure evals passed: ${fixtures.map((fixture) => fixture.id).join(", ")}\n`);
  logEvalCompleted("success", fixtures.map((fixture) => fixture.id), []);

  return {
    passed: true,
    fixtureIds: fixtures.map((fixture) => fixture.id),
    diagnostics: [],
    assertionResults,
    cellOutputs,
  };
}

export async function loadGenerateAdventureEvalFixtures(
  fixturesDirectory: string,
): Promise<GenerateAdventureEvalFixture[]> {
  const fixtureFileNames = (await readdir(fixturesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (fixtureFileNames.length === 0) {
    throw new Error(`No Generate Adventure eval fixtures found in ${fixturesDirectory}.`);
  }

  return Promise.all(
    fixtureFileNames.map(async (fileName) => {
      const fixturePath = path.join(fixturesDirectory, fileName);
      const rawFixture = await readFile(fixturePath, "utf8");

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawFixture);
      } catch (error) {
        throw new Error(`${fileName}: fixture JSON is invalid.`, { cause: error });
      }

      return parseGenerateAdventureEvalFixture(parsedJson, fileName);
    }),
  );
}

function loadNextEnvironmentWhenUsingProcessEnv(environment: NodeJS.ProcessEnv | undefined): void {
  if (environment !== undefined) {
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

export function validateOpenAIConfiguration(
  environment: NodeJS.ProcessEnv,
): string | null {
  try {
    const config = loadOpenAIAdventureGenerationConfig(environment);

    if (isPlaceholderValue(config.apiKey)) {
      return "OPENAI_API_KEY appears to be a placeholder value.";
    }

    const modelChecks = [
      ["OPENAI_ADVENTURE_GENERATION_MODEL", config.model],
      ["OPENAI_ADVENTURE_CONTENT_MODEL", loadOpenAIAdventureContentConfig(environment).model],
      ["OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL", loadOpenAIAdventureDependencyLinkerConfig(environment).model],
      ["OPENAI_ADVENTURE_XP_BALANCER_MODEL", loadOpenAIAdventureXpBalancerConfig(environment).model],
    ] as const;

    for (const [name, model] of modelChecks) {
      if (isPlaceholderValue(model)) {
        return `${name} appears to be a placeholder value.`;
      }
    }

    return null;
  } catch (error) {
    const message = formatConfigurationError(error);
    serverLogger.warn(
      {
        event: APPLICATION_LOG_EVENTS.GENERATE_ADVENTURE_EVAL_CONFIG_BLOCKED,
        flow: "generate_adventure_eval",
        operation: "eval_generate_adventure",
        result: "configuration_blocked",
        error: serializeErrorForLog(error),
      },
      "Generate Adventure eval configuration is unavailable.",
    );
    return message;
  }
}

export function buildAdventureGeneratorRequest(
  fixture: GenerateAdventureEvalFixture,
): AdventureGeneratorRequest {
  return {
    userId: `eval-user-${fixture.id}`,
    adventureId: `eval-adventure-${fixture.id}`,
    goalText: fixture.goalText,
    interviewOutputArtifactId: `eval-artifact-${fixture.id}`,
    interviewOutputArtifact: fixture.interviewOutputArtifact,
    transcript: fixture.transcript.map((message, index) => ({
      id: `eval-message-${fixture.id}-${index + 1}`,
      role: message.role,
      content: message.content,
      sequenceNumber: index + 1,
      createdAt: EVAL_CREATED_AT,
    })),
  };
}

function buildGenerateAdventureCellOutput(
  fixture: GenerateAdventureEvalFixture,
  request: AdventureGeneratorRequest,
  adventure: GeneratedAdventure,
): FocusedAdventureStepCellOutput {
  const outputMarkdown = JSON.stringify(adventure, null, 2);

  return {
    fixtureId: fixture.id,
    outputMarkdown,
    outputPreview: adventure.title,
    artifacts: buildRawEvalArtifacts({
      prompt: "",
      request,
      response: adventure,
      expected: fixture.expectations,
    }),
  };
}

export function formatDiagnostic(diagnostic: GenerateAdventureEvalFailureDiagnostic): string {
  return `[${diagnostic.fixtureId}] ${diagnostic.area}: ${diagnostic.message}`;
}

async function createProductionAdventureGenerator(): Promise<GenerateAdventureEvalGenerator> {
  const { createAdventurePlannerComposition } = await import("../infra/adventure-planner-composition");
  return createAdventurePlannerComposition().createAdventureGenerator();
}

function buildRunDiagnostic(
  area: AdventureQualityDiagnostic["area"],
  message: string,
): GenerateAdventureEvalFailureDiagnostic {
  return { fixtureId: "runner", area, message };
}

function writeDiagnostic(
  output: Pick<NodeJS.WriteStream, "write">,
  diagnostic: GenerateAdventureEvalFailureDiagnostic,
): void {
  output.write(`${formatDiagnostic(diagnostic)}\n`);
}

function classifyGenerationFailureArea(error: unknown): GenerateAdventureEvalFailureDiagnostic["area"] {
  if (error instanceof AdventureGeneratorError && error.code === "configuration_missing") {
    return "configuration";
  }

  const message = collectErrorMessages(error).join(" ").toLowerCase();

  if (message.includes("content generation") || message.includes("adventure content")) {
    return "content generation";
  }

  if (message.includes("dependency linking") || message.includes("dependency linker")) {
    return "dependency linking";
  }

  if (message.includes("xp balancing") || message.includes("xp balancer")) {
    return "xp balancing";
  }

  if (message.includes("final assembly")) {
    return "final assembly";
  }

  if (message.includes("final validation")) {
    return "final validation";
  }

  return "generation";
}

function formatConfigurationError(error: unknown): string {
  const message = formatEvalError(error);

  if (message.includes("OPENAI_API_KEY is required")) {
    return "OPENAI_API_KEY is required to run Generate Adventure evals.";
  }

  return message;
}

function formatGenerationError(error: unknown): string {
  if (error instanceof AdventureGeneratorError) {
    if (error.code === "provider_output_invalid") {
      return formatInvalidProviderOutputError(error);
    }

    if (error.code === "configuration_missing") {
      return `OpenAI configuration is missing: ${error.message}`;
    }

    return `OpenAI Adventure generation failed: ${error.message}`;
  }

  return `Adventure generation failed: ${formatEvalError(error)}`;
}

function logEvalStarted(fixtureIds: string[]): void {
  serverLogger.info(
    {
      event: APPLICATION_LOG_EVENTS.GENERATE_ADVENTURE_EVAL_STARTED,
      flow: "generate_adventure_eval",
      operation: "eval_generate_adventure",
      result: "started",
      fixtureCount: fixtureIds.length,
      fixtureIds,
    },
    "Generate Adventure eval run started.",
  );
}

function logEvalCompleted(
  result: "success" | "failure",
  fixtureIds: string[],
  diagnostics: GenerateAdventureEvalFailureDiagnostic[],
): void {
  const log = result === "success" ? serverLogger.info.bind(serverLogger) : serverLogger.warn.bind(serverLogger);
  log(
    {
      event: result === "success"
        ? APPLICATION_LOG_EVENTS.GENERATE_ADVENTURE_EVAL_COMPLETED
        : APPLICATION_LOG_EVENTS.GENERATE_ADVENTURE_EVAL_FAILED,
      flow: "generate_adventure_eval",
      operation: "eval_generate_adventure",
      result,
      fixtureCount: fixtureIds.length,
      fixtureIds,
      diagnosticCount: diagnostics.length,
      diagnosticAreas: [...new Set(diagnostics.map((diagnostic) => diagnostic.area))],
    },
    result === "success" ? "Generate Adventure eval run completed." : "Generate Adventure eval run failed.",
  );
}

function formatInvalidProviderOutputError(error: AdventureGeneratorError): string {
  const validationDetails = collectSafeValidationDetails(error);

  return [
    `OpenAI Adventure output was invalid: ${error.message}`,
    ...(validationDetails.length > 0 ? [`Validation detail: ${validationDetails.join(" -> ")}`] : []),
  ].join(" ");
}

function collectErrorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [];
  }

  const messages = [error.message];
  const cause = error.cause;

  if (cause instanceof Error) {
    messages.push(...collectErrorMessages(cause));
  }

  return messages;
}

function collectSafeValidationDetails(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [];
  }

  return unique(
    collectErrorMessages(error)
      .slice(1)
      .map((message) => message.trim())
      .filter((message) => isSafeValidationMessage(message))
      .map(truncateDiagnosticDetail),
  );
}

function isSafeValidationMessage(message: string): boolean {
  if (message.length === 0 || message.length > 240) {
    return false;
  }

  if (/sk-[a-z0-9_-]+/iu.test(message) || /api[_ -]?key/iu.test(message)) {
    return false;
  }

  return [
    "must be",
    "missing",
    "unknown",
    "duplicate",
    "references",
    "did not complete",
    "was refused",
    "structured output",
    "field",
    "array",
    "object",
  ].some((safeSignal) => message.toLowerCase().includes(safeSignal));
}

function truncateDiagnosticDetail(message: string): string {
  const maxLength = 180;
  return message.length > maxLength ? `${message.slice(0, maxLength)}…` : message;
}

function formatEvalError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error.";
}

function isPlaceholderValue(value: string): boolean {
  return /^(changeme|change-me|placeholder|todo|your-|replace-me|replace-with-|example)/iu.test(value.trim());
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
