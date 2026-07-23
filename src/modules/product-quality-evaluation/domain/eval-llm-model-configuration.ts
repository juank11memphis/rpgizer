import type { EvalDiagnostic } from "./eval-matrix";

export type EvalLlmModelOption = {
  id: string;
  label: string;
};

export type EvalLlmModelGroup = {
  label: string;
  models: EvalLlmModelOption[];
};

export type EvalLlmConfiguration = {
  selectedModel: string;
  modelGroups: EvalLlmModelGroup[];
};

export type EvalLlmModelValidationResult =
  | { status: "allowed"; model: string }
  | { status: "blocked"; diagnostic: EvalDiagnostic };

export const EVAL_LLM_MODEL_GROUPS: EvalLlmModelGroup[] = [
  {
    label: "GPT-5 family",
    models: [
      { id: "gpt-5.4-nano", label: "gpt-5.4-nano" },
      { id: "gpt-5.4-mini", label: "gpt-5.4-mini" },
      { id: "gpt-5.4", label: "gpt-5.4" },
    ],
  },
  {
    label: "Reasoning models",
    models: [
      { id: "o4-mini", label: "o4-mini" },
      { id: "o3", label: "o3" },
    ],
  },
  {
    label: "GPT-4 family",
    models: [
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
      { id: "gpt-4o", label: "gpt-4o" },
      { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { id: "gpt-4.1", label: "gpt-4.1" },
    ],
  },
];

export function cloneEvalLlmModelGroups(): EvalLlmModelGroup[] {
  return EVAL_LLM_MODEL_GROUPS.map((group) => ({
    ...group,
    models: group.models.map((model) => ({ ...model })),
  }));
}

export function isAllowedEvalLlmModel(model: string): boolean {
  const normalizedModel = normalizeEvalLlmModel(model);

  return EVAL_LLM_MODEL_GROUPS.some((group) =>
    group.models.some((allowedModel) => allowedModel.id === normalizedModel),
  );
}

export function validateEvalLlmModel(
  model: string,
  source: "selected" | "default",
): EvalLlmModelValidationResult {
  const normalizedModel = normalizeEvalLlmModel(model);

  if (isAllowedEvalLlmModel(normalizedModel)) {
    return { status: "allowed", model: normalizedModel };
  }

  return {
    status: "blocked",
    diagnostic: buildEvalLlmModelConfigurationDiagnostic(source),
  };
}

export function buildEvalLlmConfiguration(selectedModel: string): EvalLlmConfiguration {
  return {
    selectedModel: normalizeEvalLlmModel(selectedModel),
    modelGroups: cloneEvalLlmModelGroups(),
  };
}

export function normalizeEvalLlmModel(model: string): string {
  return model.trim();
}

function buildEvalLlmModelConfigurationDiagnostic(source: "selected" | "default"): EvalDiagnostic {
  return {
    scope: "configuration",
    code: source === "selected" ? "unsupported_selected_eval_model" : "unsupported_default_eval_model",
    message: source === "selected"
      ? "The selected model is not in the allowed eval model list. Choose one of the supported eval models."
      : "The suite default model is not in the allowed eval model list. Choose a supported eval model before running this suite.",
  };
}
