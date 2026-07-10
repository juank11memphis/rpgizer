import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import type { GeneratedAdventure } from "../domain/generated-adventure";
import { loadOpenAIGameMasterInterviewerConfig } from "../../game-master-assistant/infra/openai-game-master-interviewer-config";
import { checkGeneratedAdventureQuality } from "./adventure-quality-checks";
import { parseGenerateAdventureEvalFixture } from "./generate-adventure-eval-fixture-parser";
import type {
  AdventureQualityDiagnostic,
  GenerateAdventureEvalFixture,
} from "./generate-adventure-eval-types";

const DEFAULT_FIXTURES_DIRECTORY = path.join(
  process.cwd(),
  "src/modules/adventure-planner/evals/fixtures",
);
const DEFAULT_PROMPT_PATH = path.join(
  process.cwd(),
  "src/modules/adventure-planner/infra/prompts/generate-adventure.md",
);
const EVAL_CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

export type GenerateAdventureEvalGenerator = {
  generateAdventure(input: AdventureGeneratorRequest): Promise<GeneratedAdventure>;
};

export type GenerateAdventureEvalRunOptions = {
  fixturesDirectory?: string;
  promptPath?: string;
  environment?: NodeJS.ProcessEnv;
  createGenerator?: (instructions: string) => Promise<GenerateAdventureEvalGenerator> | GenerateAdventureEvalGenerator;
  output?: Pick<NodeJS.WriteStream, "write">;
  errorOutput?: Pick<NodeJS.WriteStream, "write">;
};

export type GenerateAdventureEvalRunResult = {
  passed: boolean;
  fixtureIds: string[];
  diagnostics: GenerateAdventureEvalFailureDiagnostic[];
};

export type GenerateAdventureEvalFailureDiagnostic = AdventureQualityDiagnostic & {
  fixtureId: string;
};

export async function runGenerateAdventureEvals(
  options: GenerateAdventureEvalRunOptions = {},
): Promise<GenerateAdventureEvalRunResult> {
  const output = options.output ?? process.stdout;
  const errorOutput = options.errorOutput ?? process.stderr;
  const environment = options.environment ?? process.env;

  const configurationError = validateOpenAIConfiguration(environment);
  if (configurationError !== null) {
    const diagnostic = buildRunDiagnostic("configuration", configurationError);
    writeDiagnostic(errorOutput, diagnostic);
    return { passed: false, fixtureIds: [], diagnostics: [diagnostic] };
  }

  let fixtures: GenerateAdventureEvalFixture[];
  let generator: GenerateAdventureEvalGenerator;

  try {
    fixtures = await loadGenerateAdventureEvalFixtures(
      options.fixturesDirectory ?? DEFAULT_FIXTURES_DIRECTORY,
    );
    const instructions = await readFile(options.promptPath ?? DEFAULT_PROMPT_PATH, "utf8");
    generator = await (options.createGenerator ?? createOpenAIAdventureGenerator)(instructions);
  } catch (error) {
    const diagnostic = buildRunDiagnostic("configuration", formatEvalError(error));
    writeDiagnostic(errorOutput, diagnostic);
    return { passed: false, fixtureIds: [], diagnostics: [diagnostic] };
  }

  const diagnostics: GenerateAdventureEvalFailureDiagnostic[] = [];

  for (const fixture of fixtures) {
    try {
      const adventure = await generator.generateAdventure(buildAdventureGeneratorRequest(fixture));
      const result = checkGeneratedAdventureQuality(adventure, fixture);

      diagnostics.push(
        ...result.diagnostics.map((diagnostic) => ({ fixtureId: fixture.id, ...diagnostic })),
      );
    } catch (error) {
      diagnostics.push({
        fixtureId: fixture.id,
        area: "generation",
        message: formatGenerationError(error),
      });
    }
  }

  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) {
      writeDiagnostic(errorOutput, diagnostic);
    }

    return {
      passed: false,
      fixtureIds: fixtures.map((fixture) => fixture.id),
      diagnostics,
    };
  }

  output.write(`Generate Adventure evals passed: ${fixtures.map((fixture) => fixture.id).join(", ")}\n`);

  return {
    passed: true,
    fixtureIds: fixtures.map((fixture) => fixture.id),
    diagnostics: [],
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

export function validateOpenAIConfiguration(
  environment: NodeJS.ProcessEnv,
): string | null {
  try {
    const config = loadOpenAIGameMasterInterviewerConfig(environment);

    if (isPlaceholderValue(config.apiKey)) {
      return "OPENAI_API_KEY appears to be a placeholder value.";
    }

    if (isPlaceholderValue(config.model)) {
      return "OPENAI_GAME_MASTER_MODEL appears to be a placeholder value.";
    }

    return null;
  } catch (error) {
    return formatConfigurationError(error);
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

export function formatDiagnostic(diagnostic: GenerateAdventureEvalFailureDiagnostic): string {
  return `[${diagnostic.fixtureId}] ${diagnostic.area}: ${diagnostic.message}`;
}

async function createOpenAIAdventureGenerator(
  instructions: string,
): Promise<GenerateAdventureEvalGenerator> {
  const { OpenAIAdventureGenerator } = await import("../infra/openai-adventure-generator");
  return new OpenAIAdventureGenerator({ instructions });
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

function formatConfigurationError(error: unknown): string {
  const message = formatEvalError(error);

  if (message.includes("OPENAI_API_KEY is required")) {
    return "OPENAI_API_KEY is required to run Generate Adventure evals.";
  }

  if (message.includes("OPENAI_GAME_MASTER_MODEL is required")) {
    return "OPENAI_GAME_MASTER_MODEL is required by the runtime Adventure generator config.";
  }

  return message;
}

function formatGenerationError(error: unknown): string {
  if (error instanceof AdventureGeneratorError) {
    if (error.code === "provider_output_invalid") {
      return `OpenAI Adventure output was invalid: ${error.message}`;
    }

    if (error.code === "configuration_missing") {
      return `OpenAI configuration is missing: ${error.message}`;
    }

    return `OpenAI Adventure generation failed: ${error.message}`;
  }

  return `Adventure generation failed: ${formatEvalError(error)}`;
}

function formatEvalError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown error.";
}

function isPlaceholderValue(value: string): boolean {
  return /^(changeme|change-me|placeholder|todo|your-|replace-me|example)/iu.test(value.trim());
}

async function main(): Promise<void> {
  const result = await runGenerateAdventureEvals();
  if (!result.passed) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] === undefined ? "" : path.resolve(process.argv[1]);

if (invokedFilePath === currentFilePath) {
  void main();
}
