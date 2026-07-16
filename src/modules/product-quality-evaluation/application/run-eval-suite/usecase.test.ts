import { describe, expect, it, vi } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "../../domain/eval-suite";
import { runEvalSuite, type GameMasterInterviewEvalRunner } from "./usecase";

import type {
  GameMasterInterviewEvalCell,
  GameMasterInterviewEvalRunResult,
} from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";

function runnerReturning(result: GameMasterInterviewEvalRunResult): GameMasterInterviewEvalRunner {
  return () => Promise.resolve(result);
}

describe("runEvalSuite", () => {
  it("normalizes a passed structured Game Master Interview eval run", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        runGameMasterInterviewEvals: runnerReturning({
          status: "passed",
          fixtureIds: ["become-a-chef"],
          diagnostics: [],
          cells: [buildGameMasterCell({ status: "passed" })],
          durationMs: 42,
        }),
      },
    );

    expect(result).toEqual({
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "passed",
      summary: "Game Master Interview Evals passed.",
      diagnostics: [],
      durationMs: 42,
      matrix: {
        testCases: [
          {
            id: "become-a-chef",
            name: "Become a chef",
            inputVariables: { goal: "Become a confident home chef.", transcriptTurns: "1" },
          },
        ],
        variants: [
          {
            id: "default",
            name: "Default variant",
            promptLabel: "Default prompt",
            modelLabel: "Default model",
          },
        ],
        cells: [
          {
            id: "become-a-chef::default",
            testCaseId: "become-a-chef",
            variantId: "default",
            status: "passed",
            outputPreview: "Which dinner would you like to cook first?",
            outputMarkdown: "Which dinner would you like to cook first?",
            metrics: {
              latency: { value: 25, unit: "ms", reported: true },
              tokens: { value: null, unit: "tokens", reported: false },
              cost: { value: null, unit: "usd", reported: false },
            },
            assertions: [
              { id: "asks-one-question", label: "asks one focused question", status: "passed" },
            ],
            diagnostics: [],
            artifacts: [
              {
                id: "response",
                label: "Raw response",
                localOnly: true,
                redactionState: "redacted",
                value: "{\"messageToUser\":\"Which dinner would you like to cook first?\"}",
                preview: "response preview",
              },
            ],
          },
        ],
      },
      aggregates: {
        totalTestCases: 1,
        totalCells: 1,
        completedCells: 1,
        passedCells: 1,
        failedCells: 0,
        blockedCells: 0,
        errorCells: 0,
        passRate: 1,
        averageLatencyMs: 25,
        totalTokens: null,
        totalCostUsd: null,
      },
    });
  });

  it("normalizes structured failed assertions without parsing diagnostic strings", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        runGameMasterInterviewEvals: runnerReturning({
          status: "failed",
          fixtureIds: ["high-stakes-finance"],
          diagnostics: [
            {
              fixtureId: "high-stakes-finance",
              message: "Expected a safer boundary-setting answer.",
            },
          ],
          cells: [
            buildGameMasterCell({
              fixtureId: "high-stakes-finance",
              testCaseName: "High stakes finance",
              status: "failed",
              assertions: [
                { id: "safe-boundary", label: "uses safe boundary", status: "passed" },
                {
                  id: "no-advice",
                  label: "avoids advice",
                  status: "failed",
                  message: "Expected a safer boundary-setting answer.",
                },
              ],
              diagnostics: [
                {
                  fixtureId: "high-stakes-finance",
                  message: "Expected a safer boundary-setting answer.",
                },
              ],
            }),
          ],
          durationMs: 84,
        }),
      },
    );

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual([
      {
        scope: "fixture",
        fixtureId: "high-stakes-finance",
        message: "Expected a safer boundary-setting answer.",
      },
    ]);
    expect(result.matrix).toMatchObject({
      testCases: [{ id: "high-stakes-finance", name: "High stakes finance" }],
      variants: [{ id: "default", name: "Default variant" }],
      cells: [
        {
          id: "high-stakes-finance::default",
          testCaseId: "high-stakes-finance",
          variantId: "default",
          status: "failed",
          outputPreview: "Which dinner would you like to cook first?",
          assertions: [
            { id: "safe-boundary", label: "uses safe boundary", status: "passed" },
            {
              id: "no-advice",
              label: "avoids advice",
              status: "failed",
              message: "Expected a safer boundary-setting answer.",
            },
          ],
          diagnostics: [
            {
              scope: "fixture",
              fixtureId: "high-stakes-finance",
              message: "Expected a safer boundary-setting answer.",
            },
          ],
        },
      ],
    });
    expect(result.matrix?.cells[0]?.metrics).toEqual({
      latency: { value: 25, unit: "ms", reported: true },
      tokens: { value: null, unit: "tokens", reported: false },
      cost: { value: null, unit: "usd", reported: false },
    });
    expect(result.aggregates).toMatchObject({
      totalTestCases: 1,
      totalCells: 1,
      completedCells: 1,
      passedCells: 0,
      failedCells: 1,
      passRate: 0,
      averageLatencyMs: 25,
      totalTokens: null,
      totalCostUsd: null,
    });
  });

  it("normalizes configuration blockers separately from failed evals", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        runGameMasterInterviewEvals: runnerReturning({
          status: "blocked",
          fixtureIds: [],
          blocker: "missing_openai_api_key",
          diagnostics: [{ message: "OPENAI_API_KEY is not configured" }],
          durationMs: 11,
        }),
      },
    );

    expect(result).toMatchObject({
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      blocker: "missing_openai_api_key",
      diagnostics: [
        {
          scope: "configuration",
          code: "missing_openai_api_key",
          message: "OPENAI_API_KEY is not configured",
        },
      ],
    });
    expect(result).not.toHaveProperty("matrix");
    expect(result).not.toHaveProperty("aggregates");
  });

  it("returns a safe error without invoking the runner for unknown suites", async () => {
    const runGameMasterInterviewEvals = vi.fn<GameMasterInterviewEvalRunner>();

    const result = await runEvalSuite(
      { suiteId: "unknown-suite" },
      { runGameMasterInterviewEvals },
    );

    expect(runGameMasterInterviewEvals).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      suiteId: "unknown-suite",
      status: "error",
      summary: "Unknown eval suite.",
      errorCode: "unknown_eval_suite",
      diagnostics: [
        {
          scope: "run",
          code: "unknown_eval_suite",
          message: "The selected eval suite is not available.",
        },
      ],
    });
    expect(result).not.toHaveProperty("matrix");
    expect(result).not.toHaveProperty("aggregates");
  });

  it("normalizes unexpected runner throws to a safe error result", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        runGameMasterInterviewEvals: async () => {
          throw new Error("provider response contained unsafe payload");
        },
      },
    );

    expect(result).toMatchObject({
      suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      status: "error",
      summary: "The eval did not finish.",
      errorName: "Error",
      diagnostics: [
        {
          scope: "run",
          code: "Error",
          message: "The eval could not finish. Try again after checking local setup.",
        },
      ],
    });
    expect(result.diagnostics[0]?.message).not.toContain("provider response");
    expect(result.diagnostics[0]?.message).not.toContain("unsafe payload");
    expect(result).not.toHaveProperty("matrix");
    expect(result).not.toHaveProperty("aggregates");
  });
});

function buildGameMasterCell(
  overrides: Partial<GameMasterInterviewEvalCell> = {},
): GameMasterInterviewEvalCell {
  const fixtureId = overrides.fixtureId ?? "become-a-chef";

  return {
    id: `${fixtureId}::default`,
    fixtureId,
    testCaseId: fixtureId,
    testCaseName: overrides.testCaseName ?? "Become a chef",
    inputVariables: overrides.inputVariables ?? {
      goal: "Become a confident home chef.",
      transcriptTurns: "1",
    },
    variantId: "default",
    variantName: "Default variant",
    status: overrides.status ?? "passed",
    output: overrides.output ?? "Which dinner would you like to cook first?",
    outputPreview: overrides.outputPreview ?? "Which dinner would you like to cook first?",
    metrics: overrides.metrics ?? {
      latencyMs: { value: 25, reported: true },
      tokenCount: { value: null, reported: false },
      costUsd: { value: null, reported: false },
    },
    assertions: overrides.assertions ?? [
      { id: "asks-one-question", label: "asks one focused question", status: "passed" },
    ],
    diagnostics: overrides.diagnostics ?? [],
    artifacts: overrides.artifacts ?? [
      {
        id: "response",
        label: "Raw response",
        localOnly: true,
        redactionState: "redacted",
        value: "{\"messageToUser\":\"Which dinner would you like to cook first?\"}",
        preview: "response preview",
      },
    ],
  };
}
