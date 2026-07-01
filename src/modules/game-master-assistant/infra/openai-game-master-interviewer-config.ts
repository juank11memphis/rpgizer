import { GameMasterInterviewerError } from "../application/start-adventure-interview/provider-error";

export type OpenAIGameMasterInterviewerConfig = {
  apiKey: string;
  model: string;
};

export type OpenAIGameMasterInterviewerEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_GAME_MASTER_MODEL?: string;
};

export function loadOpenAIGameMasterInterviewerConfig(
  environment: OpenAIGameMasterInterviewerEnvironment | NodeJS.ProcessEnv = process.env,
): OpenAIGameMasterInterviewerConfig {
  const apiKey = readRequiredEnvironmentValue(environment.OPENAI_API_KEY, "OPENAI_API_KEY");
  const model = readRequiredEnvironmentValue(
    environment.OPENAI_GAME_MASTER_MODEL,
    "OPENAI_GAME_MASTER_MODEL",
  );

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
      `${name} is required to use the OpenAI Game Master interviewer.`,
    );
  }

  return trimmedValue;
}
