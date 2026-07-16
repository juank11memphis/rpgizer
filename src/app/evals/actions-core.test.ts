import { describe, expect, it, vi } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";

import { runEvalSuiteActionCore } from "./actions-core";

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("runEvalSuiteActionCore", () => {
  it("returns a safe blocked result without delegating when the local guard blocks", async () => {
    const runEvalSuite = vi.fn();
    const logger = createLogger();

    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => false,
      runEvalSuite,
      logger,
      now: () => 10,
    });

    expect(runEvalSuite).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "blocked",
      blocker: "local_eval_dashboard_disabled",
      diagnostics: [
        {
          scope: "configuration",
          code: "local_eval_dashboard_disabled",
          message: "The Arcane Eval Console is only available in local development.",
        },
      ],
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        outcome: "blocked",
        diagnosticCount: 1,
      }),
      "Local eval suite server action completed.",
    );
  });

  it("delegates to runEvalSuite and returns successful results when allowed", async () => {
    const logger = createLogger();
    const delegatedResult = {
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "passed" as const,
      summary: "Game Master Interview Evals passed.",
      diagnostics: [],
      durationMs: 25,
    };
    const runEvalSuite = vi.fn().mockResolvedValue(delegatedResult);

    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite,
      logger,
    });

    expect(runEvalSuite).toHaveBeenCalledWith({ suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID });
    expect(result).toBe(delegatedResult);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        outcome: "passed",
        diagnosticCount: 0,
      }),
      "Local eval suite server action completed.",
    );
  });

  it("returns delegated blocked and failed results as client-safe action data", async () => {
    const blockedResult = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: async () => ({
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        status: "blocked",
        summary: "Local configuration is missing or invalid.",
        diagnostics: [{ scope: "configuration", message: "OPENAI_API_KEY is not configured" }],
        blocker: "missing_openai_api_key",
        durationMs: 1,
      }),
      logger: createLogger(),
    });
    const failedResult = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: async () => ({
        suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        status: "failed",
        summary: "Some fixtures need attention.",
        diagnostics: [{ scope: "fixture", fixtureId: "learn-a-language", message: "Expected one focused follow-up question." }],
        durationMs: 1,
      }),
      logger: createLogger(),
    });

    expect(blockedResult.status).toBe("blocked");
    expect(failedResult.status).toBe("failed");
  });

  it("converts unexpected delegated throws to safe error action data", async () => {
    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: async () => {
        throw new Error("raw provider payload should not be surfaced");
      },
      logger: createLogger(),
      now: () => 7,
    });

    expect(result.status).toBe("error");
    expect(result.diagnostics[0]?.message).toBe(
      "The eval could not finish. Try again after checking local setup.",
    );
    expect(result.diagnostics[0]?.message).not.toContain("provider payload");
  });
});
