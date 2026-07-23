import { describe, expect, it } from "vitest";

import {
  buildFocusedOpenAIConfig,
  formatFocusedDiagnostic,
  validateFocusedOpenAIConfiguration,
} from "./focused-adventure-step-eval-runner";

function buildEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-test",
    OPENAI_ADVENTURE_GENERATION_MODEL: "gpt-test",
    ...overrides,
  };
}

describe("focused Adventure step eval runner plumbing", () => {
  it("validates missing and placeholder OpenAI configuration clearly", () => {
    expect(validateFocusedOpenAIConfiguration("content", buildEnvironment({ OPENAI_API_KEY: " " }))).toContain(
      "OPENAI_API_KEY is required to run Adventure content generation evals",
    );
    expect(validateFocusedOpenAIConfiguration("linking", buildEnvironment({ OPENAI_API_KEY: "placeholder" }))).toBe(
      "OPENAI_API_KEY appears to be a placeholder value.",
    );
    expect(
      validateFocusedOpenAIConfiguration(
        "xp",
        buildEnvironment({ OPENAI_ADVENTURE_XP_BALANCER_MODEL: "replace-with-model" }),
      ),
    ).toBe("OPENAI_ADVENTURE_XP_BALANCER_MODEL appears to be a placeholder value.");
    expect(validateFocusedOpenAIConfiguration("content", buildEnvironment())).toBeNull();
  });

  it("builds focused OpenAI configs with a run-scoped selected model", () => {
    const environment = buildEnvironment({
      OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-content",
      OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "gpt-linking",
      OPENAI_ADVENTURE_XP_BALANCER_MODEL: "gpt-xp",
    });

    expect(buildFocusedOpenAIConfig("content", environment, "o4-mini")).toEqual({
      apiKey: "sk-test",
      model: "o4-mini",
    });
    expect(buildFocusedOpenAIConfig("linking", environment, "o4-mini").model).toBe("o4-mini");
    expect(buildFocusedOpenAIConfig("xp", environment, "o4-mini").model).toBe("o4-mini");
    expect(buildFocusedOpenAIConfig("content", environment).model).toBe("gpt-content");
  });

  it("allows selected models to override placeholder step model settings", () => {
    expect(
      validateFocusedOpenAIConfiguration(
        "xp",
        buildEnvironment({ OPENAI_ADVENTURE_XP_BALANCER_MODEL: "replace-with-model" }),
        "o4-mini",
      ),
    ).toBeNull();
  });

  it("formats diagnostics consistently", () => {
    expect(
      formatFocusedDiagnostic({ fixtureId: "fixture-1", area: "references", message: "missing link" }),
    ).toBe("[fixture-1] references: missing link");
  });
});
