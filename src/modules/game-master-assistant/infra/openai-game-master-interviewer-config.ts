import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export type OpenAIGameMasterInterviewerConfig = {
  apiKey: string;
  model: string;
};

export type OpenAIGameMasterInterviewerEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_GAME_MASTER_MODEL?: string;
  OPENAI_INTERVIEW_SUMMARY_MODEL?: string;
  OPENAI_ADVENTURE_GENERATION_MODEL?: string;
  OPENAI_ADVENTURE_CONTENT_MODEL?: string;
};

export function loadOpenAIGameMasterInterviewerConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv = process.env,
): OpenAIGameMasterInterviewerConfig {
  return loadOpenAIModelConfig(environment, "OPENAI_GAME_MASTER_MODEL");
}

export function loadOpenAIInterviewSummaryConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv = process.env,
): OpenAIGameMasterInterviewerConfig {
  return loadOpenAIModelConfig(environment, "OPENAI_INTERVIEW_SUMMARY_MODEL");
}

export function loadOpenAIAdventureGenerationConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv = process.env,
): OpenAIGameMasterInterviewerConfig {
  return loadOpenAIModelConfig(environment, "OPENAI_ADVENTURE_GENERATION_MODEL");
}

export function loadOpenAIAdventureContentConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv = process.env,
): OpenAIGameMasterInterviewerConfig {
  const apiKey = readRequiredEnvironmentValue(environment.OPENAI_API_KEY, "OPENAI_API_KEY");
  const model = readModelEnvironmentValue(
    environment.OPENAI_ADVENTURE_CONTENT_MODEL ?? environment.OPENAI_ADVENTURE_GENERATION_MODEL,
  );

  return { apiKey, model };
}

function loadOpenAIModelConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv,
  modelEnvironmentVariableName: keyof Pick<
    OpenAIGameMasterInterviewerEnvironment,
    | "OPENAI_GAME_MASTER_MODEL"
    | "OPENAI_INTERVIEW_SUMMARY_MODEL"
    | "OPENAI_ADVENTURE_GENERATION_MODEL"
    | "OPENAI_ADVENTURE_CONTENT_MODEL"
  >,
): OpenAIGameMasterInterviewerConfig {
  const apiKey = readRequiredEnvironmentValue(environment.OPENAI_API_KEY, "OPENAI_API_KEY");
  const model = readModelEnvironmentValue(environment[modelEnvironmentVariableName]);

  return { apiKey, model };
}

function readRequiredEnvironmentValue(
  value: string | undefined,
  name: string,
): string {
  const trimmedValue = value?.trim() ?? "";

  if (trimmedValue.length === 0) {
    throw new GameMasterInterviewerError(
      "configuration_missing",
      `${name} is required to use OpenAI providers.`,
    );
  }

  return trimmedValue;
}

function readModelEnvironmentValue(value: string | undefined): string {
  const trimmedValue = value?.trim() ?? "";

  if (trimmedValue.length === 0) {
    return DEFAULT_OPENAI_MODEL;
  }

  return trimmedValue;
}
