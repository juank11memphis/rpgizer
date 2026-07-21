import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import {
  loadOpenAIAdventureContentConfig,
  loadOpenAIAdventureDependencyLinkerConfig,
  loadOpenAIAdventureXpBalancerConfig,
  type OpenAIGameMasterInterviewerConfig,
} from "../../game-master-assistant/infra/openai-game-master-interviewer-config";
import type { AdventureQualityAssertionOutcome, AdventureQualityDiagnostic } from "./generate-adventure-eval-types";

export type FocusedAdventureStep = "content" | "linking" | "xp";

export type FocusedAdventureStepDiagnostic = AdventureQualityDiagnostic & {
  fixtureId: string;
};

export type FocusedAdventureStepAssertionResult = {
  fixtureId: string;
  assertions: AdventureQualityAssertionOutcome[];
};

export type FocusedAdventureStepCellArtifact = {
  id: string;
  label: string;
  redactionState: "not_available" | "redacted";
  value?: string;
  preview?: string;
};

export type FocusedAdventureStepCellOutput = {
  fixtureId: string;
  outputMarkdown: string;
  outputPreview: string;
  artifacts: FocusedAdventureStepCellArtifact[];
};

export type EvalOutput = Pick<NodeJS.WriteStream, "write">;

export type FocusedAdventureStepRunResult = {
  passed: boolean;
  fixtureIds: string[];
  diagnostics: FocusedAdventureStepDiagnostic[];
  assertionResults: FocusedAdventureStepAssertionResult[];
  cellOutputs: FocusedAdventureStepCellOutput[];
};

export type FocusedAdventureStepRunContext = {
  output: EvalOutput;
  errorOutput: EvalOutput;
  environment: NodeJS.ProcessEnv;
};

export function prepareFocusedAdventureStepRun(options: {
  environment?: NodeJS.ProcessEnv;
  output?: EvalOutput;
  errorOutput?: EvalOutput;
}): FocusedAdventureStepRunContext {
  loadNextEnvironmentWhenUsingProcessEnv(options.environment);

  return {
    environment: options.environment ?? process.env,
    output: options.output ?? process.stdout,
    errorOutput: options.errorOutput ?? process.stderr,
  };
}

export function validateFocusedOpenAIConfiguration(
  step: FocusedAdventureStep,
  environment: NodeJS.ProcessEnv,
): string | null {
  try {
    const config = loadFocusedStepConfig(step, environment);
    const modelEnvironmentVariable = getModelEnvironmentVariable(step);

    if (isPlaceholderValue(config.apiKey)) {
      return "OPENAI_API_KEY appears to be a placeholder value.";
    }

    if (
      environment[modelEnvironmentVariable] !== undefined &&
      isPlaceholderValue(environment[modelEnvironmentVariable] ?? "")
    ) {
      return `${modelEnvironmentVariable} appears to be a placeholder value.`;
    }

    if (
      environment[modelEnvironmentVariable] === undefined &&
      environment.OPENAI_ADVENTURE_GENERATION_MODEL !== undefined &&
      isPlaceholderValue(environment.OPENAI_ADVENTURE_GENERATION_MODEL)
    ) {
      return "OPENAI_ADVENTURE_GENERATION_MODEL appears to be a placeholder value.";
    }

    if (isPlaceholderValue(config.model)) {
      return `${modelEnvironmentVariable} resolved to a placeholder value.`;
    }

    return null;
  } catch (error) {
    return formatConfigurationError(step, error);
  }
}

export function buildRunnerDiagnostic(
  area: AdventureQualityDiagnostic["area"],
  message: string,
): FocusedAdventureStepDiagnostic {
  return { fixtureId: "runner", area, message };
}

export function selectEvalFixtures<TFixture extends { id: string }>(
  fixtures: TFixture[],
  testCaseId: string | undefined,
): TFixture[] {
  if (!testCaseId) {
    return fixtures;
  }

  return fixtures.filter((fixture) => fixture.id === testCaseId);
}

export function buildMissingTestCaseDiagnostic(testCaseId: string): FocusedAdventureStepDiagnostic {
  return buildRunnerDiagnostic("configuration", `No eval fixture found for Test Case "${testCaseId}".`);
}

export function formatFocusedDiagnostic(diagnostic: FocusedAdventureStepDiagnostic): string {
  return `[${diagnostic.fixtureId}] ${diagnostic.area}: ${diagnostic.message}`;
}

export function writeFocusedDiagnostic(
  output: EvalOutput,
  diagnostic: FocusedAdventureStepDiagnostic,
): void {
  output.write(`${formatFocusedDiagnostic(diagnostic)}\n`);
}

export function formatFocusedProviderError(step: FocusedAdventureStep, error: unknown): string {
  if (error instanceof AdventureGeneratorError) {
    if (error.code === "provider_output_invalid") {
      const causeMessage = getErrorCauseMessage(error);
      const baseMessage = `OpenAI Adventure ${getStepLabel(step)} output was invalid: ${error.message}`;
      return causeMessage === null ? baseMessage : `${baseMessage} Cause: ${causeMessage}`;
    }

    if (error.code === "configuration_missing") {
      return `OpenAI configuration is missing: ${error.message}`;
    }

    return `OpenAI Adventure ${getStepLabel(step)} failed: ${error.message}`;
  }

  return `Adventure ${getStepLabel(step)} failed: ${formatEvalError(error)}`;
}

export async function loadJsonFixtures<T>(
  fixturesDirectory: string,
  parseFixture: (input: unknown, fixtureName: string) => T,
): Promise<T[]> {
  const fixtureFileNames = (await readdir(fixturesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (fixtureFileNames.length === 0) {
    throw new Error(`No eval fixtures found in ${fixturesDirectory}.`);
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

      return parseFixture(parsedJson, fileName);
    }),
  );
}

export function buildPassedResult(
  output: EvalOutput,
  label: string,
  fixtureIds: string[],
  assertionResults: FocusedAdventureStepAssertionResult[] = [],
  cellOutputs: FocusedAdventureStepCellOutput[] = [],
): FocusedAdventureStepRunResult {
  output.write(`${label} evals passed: ${fixtureIds.join(", ")}\n`);
  return { passed: true, fixtureIds, diagnostics: [], assertionResults, cellOutputs };
}

export function buildFailedResult(
  errorOutput: EvalOutput,
  fixtureIds: string[],
  diagnostics: FocusedAdventureStepDiagnostic[],
  assertionResults: FocusedAdventureStepAssertionResult[] = [],
  cellOutputs: FocusedAdventureStepCellOutput[] = [],
): FocusedAdventureStepRunResult {
  for (const diagnostic of diagnostics) {
    writeFocusedDiagnostic(errorOutput, diagnostic);
  }

  return { passed: false, fixtureIds, diagnostics, assertionResults, cellOutputs };
}

export function loadFocusedStepConfig(
  step: FocusedAdventureStep,
  environment: NodeJS.ProcessEnv,
): OpenAIGameMasterInterviewerConfig {
  if (step === "content") {
    return loadOpenAIAdventureContentConfig(environment);
  }

  if (step === "linking") {
    return loadOpenAIAdventureDependencyLinkerConfig(environment);
  }

  return loadOpenAIAdventureXpBalancerConfig(environment);
}

export function getModelEnvironmentVariable(step: FocusedAdventureStep): string {
  if (step === "content") {
    return "OPENAI_ADVENTURE_CONTENT_MODEL";
  }

  if (step === "linking") {
    return "OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL";
  }

  return "OPENAI_ADVENTURE_XP_BALANCER_MODEL";
}

export function formatEvalError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error.";
}

function loadNextEnvironmentWhenUsingProcessEnv(environment: NodeJS.ProcessEnv | undefined): void {
  if (environment !== undefined) {
    return;
  }

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
}

function formatConfigurationError(step: FocusedAdventureStep, error: unknown): string {
  const message = formatEvalError(error);

  if (message.includes("OPENAI_API_KEY is required")) {
    return `OPENAI_API_KEY is required to run Adventure ${getStepLabel(step)} evals.`;
  }

  return message;
}

function getStepLabel(step: FocusedAdventureStep): string {
  if (step === "content") {
    return "content generation";
  }

  if (step === "linking") {
    return "dependency linking";
  }

  return "XP balancing";
}

function getErrorCauseMessage(error: Error): string | null {
  const cause = error.cause;

  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message;
  }

  return null;
}

function isPlaceholderValue(value: string): boolean {
  return /^(changeme|change-me|placeholder|todo|your-|replace-me|replace-with-|example)/iu.test(
    value.trim(),
  );
}
