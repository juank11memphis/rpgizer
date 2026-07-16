import { describe, expect, it, vi } from "vitest";

import type { EvalMatrix, EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";
import { createUnreportedEvalCellMetrics } from "@/modules/product-quality-evaluation/domain/eval-matrix";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";

import { runEvalSuiteActionCore } from "./actions-core";

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMatrixResult(status: "passed" | "failed" | "error"): EvalRunResult {
  const matrix = createMatrix();
  const diagnostic = {
    scope: "fixture" as const,
    fixtureId: "high-stakes-finance",
    code: "unsafe_financial_advice",
    message: "Raw assertion detail that must stay out of action logs.",
  };

  if (status === "passed") {
    return {
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status,
      summary: "Game Master Interview Evals passed.",
      diagnostics: [],
      durationMs: 25,
      matrix,
      aggregates: {
        totalTestCases: 2,
        totalCells: 2,
        completedCells: 2,
        passedCells: 1,
        failedCells: 1,
        blockedCells: 0,
        errorCells: 0,
        passRate: 0.5,
        averageLatencyMs: null,
        totalTokens: null,
        totalCostUsd: null,
      },
    };
  }

  if (status === "failed") {
    return {
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status,
      summary: "Some Test Cases need attention.",
      diagnostics: [diagnostic],
      durationMs: 25,
      matrix,
      aggregates: {
        totalTestCases: 2,
        totalCells: 2,
        completedCells: 2,
        passedCells: 1,
        failedCells: 1,
        blockedCells: 0,
        errorCells: 0,
        passRate: 0.5,
        averageLatencyMs: null,
        totalTokens: null,
        totalCostUsd: null,
      },
    };
  }

  return {
    suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    status,
    summary: "The eval did not finish.",
    diagnostics: [diagnostic],
    durationMs: 25,
    errorName: "UnknownSuiteError",
    matrix,
    aggregates: {
      totalTestCases: 2,
      totalCells: 2,
      completedCells: 2,
      passedCells: 1,
      failedCells: 1,
      blockedCells: 0,
      errorCells: 0,
      passRate: 0.5,
      averageLatencyMs: null,
      totalTokens: null,
      totalCostUsd: null,
    },
  };
}

function createMatrix(): EvalMatrix {
  return {
    testCases: [
      {
        id: "become-a-chef-initial",
        name: "Become a chef",
        inputVariables: { topic: "baking" },
      },
      {
        id: "high-stakes-finance",
        name: "High-stakes finance",
        inputVariables: { topic: "finance" },
      },
    ],
    variants: [
      {
        id: "default",
        name: "Default variant",
        promptLabel: "Game Master Interview",
        modelLabel: "Default model",
      },
    ],
    cells: [
      {
        id: "become-a-chef-initial:default",
        testCaseId: "become-a-chef-initial",
        variantId: "default",
        status: "passed",
        outputPreview: "Raw output preview that must not be logged.",
        outputMarkdown: "Full generated output that must not be logged.",
        metrics: createUnreportedEvalCellMetrics(),
        assertions: [
          {
            id: "asks-focused-question",
            label: "Asks one focused question",
            status: "passed",
            message: "Assertion detail that must not be logged.",
          },
        ],
        diagnostics: [],
        artifacts: [
          {
            id: "raw-request",
            label: "Raw request",
            localOnly: true,
            redactionState: "redacted",
            value: "provider payload with sk-secret that must not be logged",
            preview: "provider payload preview that must not be logged",
          },
        ],
      },
      {
        id: "high-stakes-finance:default",
        testCaseId: "high-stakes-finance",
        variantId: "default",
        status: "failed",
        outputPreview: "Advice-like generated output that must not be logged.",
        outputMarkdown: "Full generated failure output that must not be logged.",
        metrics: createUnreportedEvalCellMetrics(),
        assertions: [
          {
            id: "avoids-financial-advice",
            label: "Avoids financial advice",
            status: "failed",
            message: "Gave advice-like wording that must not be logged.",
          },
        ],
        diagnostics: [
          {
            scope: "fixture",
            fixtureId: "high-stakes-finance",
            code: "unsafe_financial_advice",
            message: "Diagnostic details that must not be logged.",
          },
        ],
        artifacts: [],
      },
    ],
  };
}

function getCompletionPayload(logger: ReturnType<typeof createLogger>) {
  const calls = [...logger.info.mock.calls, ...logger.warn.mock.calls, ...logger.error.mock.calls];
  const call = calls.find(
    ([payload]) =>
      typeof payload === "object" &&
      payload !== null &&
      "event" in payload &&
      payload.event !== APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_STARTED,
  );

  expect(call).toBeDefined();
  return call?.[0];
}

function expectSafeLogPayload(payload: unknown) {
  const serializedPayload = JSON.stringify(payload);

  expect(serializedPayload).not.toContain("Raw output preview");
  expect(serializedPayload).not.toContain("Full generated output");
  expect(serializedPayload).not.toContain("Advice-like generated output");
  expect(serializedPayload).not.toContain("Gave advice-like wording");
  expect(serializedPayload).not.toContain("provider payload");
  expect(serializedPayload).not.toContain("sk-secret");
  expect(serializedPayload).not.toContain("artifacts");
  expect(serializedPayload).not.toContain("assertions");
  expect(serializedPayload).not.toContain("matrix");
  expect(serializedPayload).not.toContain("aggregates");
  expect(serializedPayload).not.toContain("diagnostics");
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
        durationMs: 0,
        blocker: "local_eval_dashboard_disabled",
      }),
      "Local eval suite server action completed.",
    );
  });

  it("delegates to runEvalSuite and returns matrix-capable passed results unchanged", async () => {
    const logger = createLogger();
    const delegatedResult = createMatrixResult("passed");
    const runEvalSuite = vi.fn().mockResolvedValue(delegatedResult);

    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite,
      logger,
    });

    expect(runEvalSuite).toHaveBeenCalledWith({ suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID });
    expect(result).toBe(delegatedResult);
    expect(result.matrix).toBe(delegatedResult.matrix);
    expect(result.aggregates).toBe(delegatedResult.aggregates);
    const payload = getCompletionPayload(logger);
    expect(payload).toMatchObject({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_COMPLETED,
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      outcome: "passed",
      diagnosticCount: 0,
      testCaseCount: 2,
      variantCount: 1,
      failedCellCount: 1,
    });
    expectSafeLogPayload(payload);
  });

  it("returns delegated failed matrix results without treating them as blocked", async () => {
    const logger = createLogger();
    const delegatedResult = createMatrixResult("failed");

    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: vi.fn().mockResolvedValue(delegatedResult),
      logger,
    });

    expect(result).toBe(delegatedResult);
    expect(result.status).toBe("failed");
    expect(result.matrix).toBe(delegatedResult.matrix);
    const payload = getCompletionPayload(logger);
    expect(payload).toMatchObject({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_COMPLETED,
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      outcome: "failed",
      diagnosticCount: 1,
      testCaseCount: 2,
      variantCount: 1,
      failedCellCount: 1,
    });
    expect(payload).not.toHaveProperty("blocker");
    expect(payload).not.toHaveProperty("error");
    expectSafeLogPayload(payload);
  });

  it("returns delegated blocked configuration results as blocked with safe metadata", async () => {
    const logger = createLogger();
    const delegatedResult: EvalRunResult = {
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      diagnostics: [{ scope: "configuration", message: "OPENAI_API_KEY is not configured" }],
      blocker: "missing_openai_api_key",
      durationMs: 1,
    };

    const blockedResult = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: vi.fn().mockResolvedValue(delegatedResult),
      logger,
    });

    expect(blockedResult).toBe(delegatedResult);
    expect(blockedResult.status).toBe("blocked");
    const payload = getCompletionPayload(logger);
    expect(payload).toMatchObject({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_BLOCKED,
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      outcome: "blocked",
      diagnosticCount: 1,
      blocker: "missing_openai_api_key",
    });
    expect(payload).not.toHaveProperty("error");
  });

  it("returns delegated error results as client-safe action data with safe error names", async () => {
    const logger = createLogger();
    const delegatedResult = createMatrixResult("error");

    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: vi.fn().mockResolvedValue(delegatedResult),
      logger,
    });

    expect(result).toBe(delegatedResult);
    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error("Expected an error result.");
    }
    expect(result.errorName).toBe("UnknownSuiteError");
    const payload = getCompletionPayload(logger);
    expect(payload).toMatchObject({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR,
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      outcome: "error",
      diagnosticCount: 1,
      testCaseCount: 2,
      variantCount: 1,
      failedCellCount: 1,
      error: { name: "UnknownSuiteError" },
    });
    expect(payload).not.toHaveProperty("blocker");
    expectSafeLogPayload(payload);
  });

  it("converts unexpected delegated throws to safe error action data", async () => {
    const logger = createLogger();
    const result = await runEvalSuiteActionCore(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, {
      isLocalEvalDashboardEnabled: () => true,
      runEvalSuite: async () => {
        throw new Error("raw provider payload should not be surfaced");
      },
      logger,
      now: () => 7,
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error("Expected an error result.");
    }
    expect(result.summary).toBe("The eval did not finish.");
    expect(result.errorName).toBe("Error");
    expect(result.diagnostics[0]?.message).toBe(
      "The eval could not finish. Try again after checking local setup.",
    );
    expect(result.diagnostics[0]?.message).not.toContain("provider payload");
    const payload = getCompletionPayload(logger);
    expect(payload).toMatchObject({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR,
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      outcome: "error",
      diagnosticCount: 1,
      durationMs: 0,
      error: { name: "Error" },
    });
    expect(JSON.stringify(payload)).not.toContain("provider payload");
  });
});
