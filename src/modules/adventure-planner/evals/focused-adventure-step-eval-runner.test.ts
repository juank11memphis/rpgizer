import { describe, expect, it } from "vitest";

import {
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

  it("formats diagnostics consistently", () => {
    expect(
      formatFocusedDiagnostic({ fixtureId: "fixture-1", area: "references", message: "missing link" }),
    ).toBe("[fixture-1] references: missing link");
  });
});
