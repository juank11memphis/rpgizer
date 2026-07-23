import { DEFAULT_OPENAI_GAME_MASTER_MODEL } from "@/modules/game-master-assistant/infra/openai-game-master-interviewer-config";
import { buildEvalLlmConfiguration } from "../domain/eval-llm-model-configuration";

export type EvalSuiteModelEnvironment = {
  [key: string]: string | undefined;
  OPENAI_GAME_MASTER_MODEL?: string;
  OPENAI_INTERVIEW_SUMMARY_MODEL?: string;
  OPENAI_ADVENTURE_GENERATION_MODEL?: string;
  OPENAI_ADVENTURE_CONTENT_MODEL?: string;
  OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL?: string;
  OPENAI_ADVENTURE_XP_BALANCER_MODEL?: string;
};

export type EvalSuiteModelDefaults = {
  defaultVariantLabel: string;
  defaultModelLabel: string;
  defaultModel: string;
  llmConfiguration: ReturnType<typeof buildEvalLlmConfiguration>;
};

export function buildEvalSuiteModelDefaults(defaultModel: string): EvalSuiteModelDefaults {
  const normalizedDefaultModel = defaultModel.trim() || DEFAULT_OPENAI_GAME_MASTER_MODEL;

  return {
    defaultVariantLabel: normalizedDefaultModel,
    defaultModelLabel: normalizedDefaultModel,
    defaultModel: normalizedDefaultModel,
    llmConfiguration: buildEvalLlmConfiguration(normalizedDefaultModel),
  };
}

export function resolveGameMasterInterviewDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_GAME_MASTER_MODEL);
}

export function resolveInterviewArtifactDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_INTERVIEW_SUMMARY_MODEL);
}

export function resolveAdventureGenerationDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_ADVENTURE_GENERATION_MODEL);
}

export function resolveAdventureContentDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_ADVENTURE_CONTENT_MODEL ?? environment.OPENAI_ADVENTURE_GENERATION_MODEL);
}

export function resolveAdventureDependencyLinkingDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL ?? environment.OPENAI_ADVENTURE_GENERATION_MODEL);
}

export function resolveAdventureXpBalancingDefaultModel(
  environment: EvalSuiteModelEnvironment = process.env,
): string {
  return readModelValue(environment.OPENAI_ADVENTURE_XP_BALANCER_MODEL ?? environment.OPENAI_ADVENTURE_GENERATION_MODEL);
}

function readModelValue(value: string | undefined): string {
  const trimmedValue = value?.trim() ?? "";
  return trimmedValue.length === 0 ? DEFAULT_OPENAI_GAME_MASTER_MODEL : trimmedValue;
}
