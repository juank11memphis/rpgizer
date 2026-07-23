import { describe, expect, it } from "vitest";

import {
  EVAL_LLM_MODEL_GROUPS,
  buildEvalLlmConfiguration,
  cloneEvalLlmModelGroups,
  isAllowedEvalLlmModel,
  validateEvalLlmModel,
} from "./eval-llm-model-configuration";

describe("eval LLM model configuration", () => {
  it("keeps the approved model groups and cheaper-to-stronger order", () => {
    expect(EVAL_LLM_MODEL_GROUPS).toEqual([
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
    ]);
  });

  it("allows only approved selected model values", () => {
    expect(isAllowedEvalLlmModel("gpt-5.4-mini")).toBe(true);
    expect(validateEvalLlmModel(" gpt-4.1 ", "selected")).toEqual({
      status: "allowed",
      model: "gpt-4.1",
    });
  });

  it("blocks unlisted selected models with a safe diagnostic", () => {
    expect(validateEvalLlmModel("custom-model", "selected")).toEqual({
      status: "blocked",
      diagnostic: {
        scope: "configuration",
        code: "unsupported_selected_eval_model",
        message: "The selected model is not in the allowed eval model list. Choose one of the supported eval models.",
      },
    });
  });

  it("blocks unlisted suite defaults with a safe diagnostic", () => {
    expect(validateEvalLlmModel("legacy-default", "default")).toEqual({
      status: "blocked",
      diagnostic: {
        scope: "configuration",
        code: "unsupported_default_eval_model",
        message: "The suite default model is not in the allowed eval model list. Choose a supported eval model before running this suite.",
      },
    });
  });

  it("returns cloned model groups for view-model boundaries", () => {
    const first = cloneEvalLlmModelGroups();
    const second = buildEvalLlmConfiguration("gpt-5.4-mini");

    first[0]!.models[0]!.label = "mutated";

    expect(second.selectedModel).toBe("gpt-5.4-mini");
    expect(second.modelGroups[0]!.models[0]!.label).toBe("gpt-5.4-nano");
  });
});
