import { describe, expect, it, vi } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "../../domain/eval-suite";
import { runEvalSuite, type GameMasterInterviewEvalRunner } from "./usecase";

import type { GameMasterInterviewEvalRunResult } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";

function runnerReturning(result: GameMasterInterviewEvalRunResult): GameMasterInterviewEvalRunner {
  return () => Promise.resolve(result);
}

describe("runEvalSuite", () => {
  it("normalizes a passed Game Master Interview eval run", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        runGameMasterInterviewEvals: runnerReturning({
          status: "passed",
          fixtureIds: ["become-a-chef"],
          diagnostics: [],
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
    });
  });

  it("normalizes failed fixture diagnostics as safe fixture-scoped diagnostics", async () => {
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
  });
});
