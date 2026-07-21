import { describe, expect, it, vi } from "vitest";

import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
} from "../../domain/eval-suite";
import {
  runEvalSuite,
  type FocusedAdventureStepEvalRunner,
  type GameMasterInterviewEvalRunner,
  type GenerateAdventureEvalRunner,
  type InterviewOutputArtifactEvalRunner,
  type RunEvalSuiteDependencies,
} from "./usecase";

import type { FocusedAdventureStepRunResult } from "@/modules/adventure-planner/evals/focused-adventure-step-eval-runner";
import type { GenerateAdventureEvalRunResult } from "@/modules/adventure-planner/evals/run-generate-adventure-evals";
import type {
  GameMasterInterviewEvalCell,
  GameMasterInterviewEvalRunResult,
} from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";
import type {
  InterviewOutputArtifactEvalCell,
  InterviewOutputArtifactEvalRunResult,
} from "@/modules/game-master-assistant/evals/run-interview-output-artifact-evals";

function gameMasterRunnerReturning(result: GameMasterInterviewEvalRunResult): GameMasterInterviewEvalRunner {
  return () => Promise.resolve(result);
}

function artifactRunnerReturning(result: InterviewOutputArtifactEvalRunResult): InterviewOutputArtifactEvalRunner {
  return () => Promise.resolve(result);
}

function createDependencies(
  overrides: Partial<RunEvalSuiteDependencies> = {},
): RunEvalSuiteDependencies {
  return {
    runGameMasterInterviewEvals: vi.fn<GameMasterInterviewEvalRunner>().mockResolvedValue(buildPassedGameMasterResult()),
    runInterviewOutputArtifactEvals: vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue(buildPassedInterviewOutputArtifactResult()),
    runGenerateAdventureEvals: vi.fn<GenerateAdventureEvalRunner>().mockResolvedValue(buildPassedAdventureResult()),
    runAdventureContentEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockResolvedValue(buildPassedAdventureResult()),
    runAdventureLinkingEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockResolvedValue(buildPassedAdventureResult()),
    runAdventureXpEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockResolvedValue(buildPassedAdventureResult()),
    ...overrides,
  };
}

describe("runEvalSuite", () => {
  it("normalizes a passed structured Game Master Interview eval run", async () => {
    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      {
        ...createDependencies(),
        runGameMasterInterviewEvals: gameMasterRunnerReturning({
          status: "passed",
          modelLabel: "gpt-test-model",
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
              modelLabel: "gpt-test-model",
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
        ...createDependencies(),
        runGameMasterInterviewEvals: gameMasterRunnerReturning({
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
        ...createDependencies(),
        runGameMasterInterviewEvals: gameMasterRunnerReturning({
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

  it("passes selected test case scope to the Game Master Interview runner", async () => {
    const runGameMasterInterviewEvals = vi.fn<GameMasterInterviewEvalRunner>().mockResolvedValue({
      status: "passed",
      fixtureIds: ["high-stakes-finance"],
      diagnostics: [],
      cells: [buildGameMasterCell({ fixtureId: "high-stakes-finance", testCaseName: "High stakes finance" })],
      durationMs: 31,
    });

    const result = await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, testCaseId: "high-stakes-finance" },
      { ...createDependencies(), runGameMasterInterviewEvals },
    );

    expect(runGameMasterInterviewEvals).toHaveBeenCalledWith({ testCaseId: "high-stakes-finance" });
    expect(result.matrix?.testCases).toEqual([
      expect.objectContaining({ id: "high-stakes-finance", name: "High stakes finance" }),
    ]);
    expect(result.matrix?.cells.map((cell) => cell.testCaseId)).toEqual(["high-stakes-finance"]);
  });

  it("calls Interview runners without selected scope for all Test Case runs", async () => {
    const runGameMasterInterviewEvals = vi.fn<GameMasterInterviewEvalRunner>().mockResolvedValue(
      buildPassedGameMasterResult(),
    );
    const runInterviewOutputArtifactEvals = vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue(
      buildPassedInterviewOutputArtifactResult(),
    );

    await runEvalSuite(
      { suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID },
      createDependencies({ runGameMasterInterviewEvals }),
    );
    await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID },
      createDependencies({ runInterviewOutputArtifactEvals }),
    );

    expect(runGameMasterInterviewEvals).toHaveBeenCalledWith(undefined);
    expect(runInterviewOutputArtifactEvals).toHaveBeenCalledWith(undefined);
  });


  it("invokes only the selected runner for each known suite", async () => {
    const cases = [
      [GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, "runGameMasterInterviewEvals"],
      [INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID, "runInterviewOutputArtifactEvals"],
      [GENERATE_ADVENTURE_EVAL_SUITE_ID, "runGenerateAdventureEvals"],
      [ADVENTURE_CONTENT_EVAL_SUITE_ID, "runAdventureContentEvals"],
      [ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID, "runAdventureLinkingEvals"],
      [ADVENTURE_XP_BALANCING_EVAL_SUITE_ID, "runAdventureXpEvals"],
    ] as const;

    for (const [suiteId, selectedRunner] of cases) {
      const dependencies = createDependencies();

      await runEvalSuite({ suiteId }, dependencies);

      for (const [runnerName, runner] of Object.entries(dependencies)) {
        expect(runner, `${suiteId} should only call ${selectedRunner}; checked ${runnerName}`).toHaveBeenCalledTimes(
          runnerName === selectedRunner ? 1 : 0,
        );
      }
    }
  });

  it("passes selected test case scope to Interview Output Artifact evals", async () => {
    const runInterviewOutputArtifactEvals = vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue(
      buildPassedInterviewOutputArtifactResult({ fixtureId: "chef-artifact" }),
    );

    const result = await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID, testCaseId: "chef-artifact" },
      createDependencies({ runInterviewOutputArtifactEvals }),
    );

    expect(runInterviewOutputArtifactEvals).toHaveBeenCalledWith({ testCaseId: "chef-artifact" });
    expect(result).toMatchObject({
      suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
      status: "passed",
      matrix: { testCases: [{ id: "chef-artifact" }] },
    });
    expect(result.matrix?.cells.map((cell) => cell.testCaseId)).toEqual(["chef-artifact"]);
  });

  it("passes selected test case scope to Adventure eval runners", async () => {
    const cases = [
      [GENERATE_ADVENTURE_EVAL_SUITE_ID, "runGenerateAdventureEvals"],
      [ADVENTURE_CONTENT_EVAL_SUITE_ID, "runAdventureContentEvals"],
      [ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID, "runAdventureLinkingEvals"],
      [ADVENTURE_XP_BALANCING_EVAL_SUITE_ID, "runAdventureXpEvals"],
    ] as const;

    for (const [suiteId, selectedRunner] of cases) {
      const dependencies = createDependencies();

      await runEvalSuite({ suiteId, testCaseId: "learn-a-skill" }, dependencies);

      expect(dependencies[selectedRunner]).toHaveBeenCalledWith({ testCaseId: "learn-a-skill" });
    }
  });

  it("normalizes Interview Output Artifact failures, blockers, and errors", async () => {
    const failed = await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID },
      createDependencies({
        runInterviewOutputArtifactEvals: vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue({
          status: "failed",
          fixtureIds: ["artifact-fixture"],
          diagnostics: [
            {
              fixtureId: "artifact-fixture",
              assertionId: "captures-boundary",
              message: "Expected safety boundary to be captured.",
            },
          ],
          cells: [
            buildInterviewOutputArtifactCell({
              status: "failed",
              assertions: [
                {
                  id: "captures-boundary",
                  label: "captures safety boundary",
                  status: "failed",
                  message: "Expected safety boundary to be captured.",
                },
              ],
              diagnostics: [
                {
                  fixtureId: "artifact-fixture",
                  assertionId: "captures-boundary",
                  message: "Expected safety boundary to be captured.",
                },
              ],
            }),
          ],
          durationMs: 99,
        }),
      }),
    );

    expect(failed).toMatchObject({
      suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
      status: "failed",
      diagnostics: [{ scope: "fixture", fixtureId: "artifact-fixture", code: "captures-boundary" }],
      matrix: { cells: [{ status: "failed", assertions: [{ id: "captures-boundary", status: "failed" }] }] },
    });

    const blocked = await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID },
      createDependencies({
        runInterviewOutputArtifactEvals: vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue({
          status: "blocked",
          fixtureIds: [],
          blocker: "missing_openai_api_key",
          diagnostics: [{ message: "OPENAI_API_KEY is not configured" }],
          durationMs: 5,
        }),
      }),
    );

    expect(blocked).toMatchObject({
      status: "blocked",
      blocker: "missing_openai_api_key",
      diagnostics: [{ scope: "configuration" }],
    });
    expect(blocked).not.toHaveProperty("matrix");

    const error = await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID },
      createDependencies({
        runInterviewOutputArtifactEvals: vi.fn<InterviewOutputArtifactEvalRunner>().mockResolvedValue({
          status: "error",
          fixtureIds: [],
          diagnostics: [{ message: "Runner failed safely.", errorName: "EvalError" }],
          durationMs: 6,
        }),
      }),
    );

    expect(error).toMatchObject({
      status: "error",
      errorName: "EvalError",
      diagnostics: [{ scope: "run", code: "EvalError" }],
    });
  });

  it("preserves structured Interview Output Artifact cell fields", async () => {
    const artifactCell = buildInterviewOutputArtifactCell({
      metrics: {
        latencyMs: { value: 44, reported: true },
        tokenCount: { value: 321, reported: true },
        costUsd: { value: 0.0042, reported: true },
      },
      assertions: [
        { id: "captures-goal", label: "captures goal", status: "passed" },
        {
          id: "captures-boundary",
          label: "captures safety boundary",
          status: "failed",
          message: "Expected safety boundary to be captured.",
        },
      ],
      diagnostics: [
        {
          fixtureId: "artifact-fixture",
          assertionId: "captures-boundary",
          message: "Expected safety boundary to be captured.",
        },
      ],
      artifacts: [
        {
          id: "raw-artifact",
          label: "Raw artifact",
          localOnly: true,
          redactionState: "redacted",
          value: "{\"goalSummary\":\"Spanish coffee chat\"}",
          preview: "artifact preview",
        },
      ],
    });

    const result = await runEvalSuite(
      { suiteId: INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID },
      createDependencies({
        runInterviewOutputArtifactEvals: artifactRunnerReturning({
          status: "failed",
          fixtureIds: ["artifact-fixture"],
          diagnostics: [
            {
              fixtureId: "artifact-fixture",
              assertionId: "captures-boundary",
              message: "Expected safety boundary to be captured.",
            },
          ],
          cells: [artifactCell],
          durationMs: 101,
        }),
      }),
    );

    expect(result.matrix?.cells[0]).toMatchObject({
      id: "artifact-fixture::default",
      outputPreview: "Spanish coffee chat artifact",
      outputMarkdown: JSON.stringify({ goalSummary: "Spanish coffee chat" }),
      metrics: {
        latency: { value: 44, unit: "ms", reported: true },
        tokens: { value: 321, unit: "tokens", reported: true },
        cost: { value: 0.0042, unit: "usd", reported: true },
      },
      assertions: [
        { id: "captures-goal", label: "captures goal", status: "passed" },
        {
          id: "captures-boundary",
          label: "captures safety boundary",
          status: "failed",
          message: "Expected safety boundary to be captured.",
        },
      ],
      diagnostics: [
        {
          scope: "fixture",
          fixtureId: "artifact-fixture",
          code: "captures-boundary",
          message: "Expected safety boundary to be captured.",
        },
      ],
      artifacts: [
        {
          id: "raw-artifact",
          label: "Raw artifact",
          localOnly: true,
          redactionState: "redacted",
          value: "{\"goalSummary\":\"Spanish coffee chat\"}",
          preview: "artifact preview",
        },
      ],
    });
  });

  it("normalizes Adventure Planner passed, failed, blocked, unavailable metrics, and thrown errors", async () => {
    const passed = await runEvalSuite(
      { suiteId: GENERATE_ADVENTURE_EVAL_SUITE_ID },
      createDependencies({
        runGenerateAdventureEvals: vi.fn<GenerateAdventureEvalRunner>().mockResolvedValue(
          buildPassedAdventureResult(["learn-spanish"]),
        ),
      }),
    );

    expect(passed).toMatchObject({
      suiteId: GENERATE_ADVENTURE_EVAL_SUITE_ID,
      status: "passed",
      matrix: {
        testCases: [{ id: "learn-spanish", inputVariables: { fixtureId: "learn-spanish" } }],
        cells: [{ status: "passed", assertions: [
          { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
          { id: "adventure-fixture-grounding", label: "Fixture Grounding", status: "passed" },
        ], outputPreview: "Generated learn-spanish", outputMarkdown: "Generated markdown for learn-spanish" }],
      },
      aggregates: { passRate: 1, averageLatencyMs: null },
    });
    expect(passed.matrix?.cells[0]?.artifacts).toEqual([
      {
        id: "raw-output",
        label: "Raw output",
        localOnly: true,
        redactionState: "redacted",
        value: "Generated markdown for learn-spanish",
        preview: "Generated learn-spanish",
      },
    ]);
    expect(passed.matrix?.cells[0]?.metrics).toEqual({
      latency: { value: null, unit: "ms", reported: false },
      tokens: { value: null, unit: "tokens", reported: false },
      cost: { value: null, unit: "usd", reported: false },
    });

    const failed = await runEvalSuite(
      { suiteId: ADVENTURE_CONTENT_EVAL_SUITE_ID },
      createDependencies({
        runAdventureContentEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockResolvedValue({
          passed: false,
          fixtureIds: ["learn-spanish"],
          diagnostics: [
            {
              fixtureId: "learn-spanish",
              area: "fixture grounding",
              message: "Expected Spanish coffee chat context.",
            },
          ],
          assertionResults: [
            {
              fixtureId: "learn-spanish",
              assertions: [
                {
                  id: "adventure-fixture-grounding",
                  label: "Fixture Grounding",
                  status: "failed",
                  message: "Expected Spanish coffee chat context.",
                },
              ],
            },
          ],
          cellOutputs: [
            {
              fixtureId: "learn-spanish",
              outputMarkdown: "{\"title\":\"Broken content\"}",
              outputPreview: "Broken content",
              artifacts: [
                {
                  id: "generated-content",
                  label: "Generated content",
                  redactionState: "redacted",
                  value: "{\"title\":\"Broken content\"}",
                },
              ],
            },
          ],
        }),
      }),
    );

    expect(failed).toMatchObject({
      suiteId: ADVENTURE_CONTENT_EVAL_SUITE_ID,
      status: "failed",
      diagnostics: [{ scope: "fixture", fixtureId: "learn-spanish", code: "fixture grounding" }],
      matrix: { cells: [{ status: "failed", assertions: [{ label: "Fixture Grounding", status: "failed" }] }] },
    });
    expect(failed.matrix?.cells[0]).toMatchObject({
      outputPreview: "Broken content",
      outputMarkdown: "{\"title\":\"Broken content\"}",
      artifacts: [
        {
          id: "generated-content",
          label: "Generated content",
          localOnly: true,
          redactionState: "redacted",
          value: "{\"title\":\"Broken content\"}",
        },
      ],
    });

    const blocked = await runEvalSuite(
      { suiteId: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID },
      createDependencies({
        runAdventureLinkingEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockResolvedValue({
          passed: false,
          fixtureIds: [],
          diagnostics: [{ fixtureId: "runner", area: "configuration", message: "OPENAI_API_KEY is required." }],
          assertionResults: [],
          cellOutputs: [],
        }),
      }),
    );

    expect(blocked).toMatchObject({
      suiteId: ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
      status: "blocked",
      diagnostics: [{ scope: "configuration", code: "configuration" }],
      blocker: "configuration",
    });
    expect(blocked).not.toHaveProperty("matrix");

    const error = await runEvalSuite(
      { suiteId: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID },
      createDependencies({
        runAdventureXpEvals: vi.fn<FocusedAdventureStepEvalRunner>().mockRejectedValue(
          new Error("raw generated output should not be surfaced"),
        ),
      }),
    );

    expect(error).toMatchObject({
      suiteId: ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
      status: "error",
      diagnostics: [{ scope: "run", message: "The eval could not finish. Try again after checking local setup." }],
    });
  });

  it("returns a safe error without invoking the runner for unknown suites", async () => {
    const runGameMasterInterviewEvals = vi.fn<GameMasterInterviewEvalRunner>();

    const result = await runEvalSuite(
      { suiteId: "unknown-suite" },
      { ...createDependencies(), runGameMasterInterviewEvals },
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
        ...createDependencies(),
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


function buildPassedGameMasterResult(): GameMasterInterviewEvalRunResult {
  return {
    status: "passed",
    fixtureIds: ["become-a-chef"],
    diagnostics: [],
    cells: [buildGameMasterCell()],
    durationMs: 1,
  };
}

function buildPassedInterviewOutputArtifactResult(
  options: { fixtureId?: string } = {},
): InterviewOutputArtifactEvalRunResult {
  const fixtureId = options.fixtureId ?? "artifact-fixture";
  return {
    status: "passed",
    fixtureIds: [fixtureId],
    diagnostics: [],
    cells: [buildInterviewOutputArtifactCell({ fixtureId })],
    durationMs: 2,
  };
}

function buildPassedAdventureResult(fixtureIds = ["learn-a-skill"]): GenerateAdventureEvalRunResult & FocusedAdventureStepRunResult {
  return {
    passed: true,
    fixtureIds,
    diagnostics: [],
    assertionResults: fixtureIds.map((fixtureId) => ({
      fixtureId,
      assertions: [
        { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
        { id: "adventure-fixture-grounding", label: "Fixture Grounding", status: "passed" },
      ],
    })),
    cellOutputs: fixtureIds.map((fixtureId) => ({
      fixtureId,
      outputMarkdown: `Generated markdown for ${fixtureId}`,
      outputPreview: `Generated ${fixtureId}`,
      artifacts: [
        {
          id: "raw-output",
          label: "Raw output",
          redactionState: "redacted",
          value: `Generated markdown for ${fixtureId}`,
          preview: `Generated ${fixtureId}`,
        },
      ],
    })),
  };
}

function buildInterviewOutputArtifactCell(
  overrides: Partial<InterviewOutputArtifactEvalCell> = {},
): InterviewOutputArtifactEvalCell {
  const fixtureId = overrides.fixtureId ?? "artifact-fixture";

  return {
    id: `${fixtureId}::default`,
    fixtureId,
    testCaseId: fixtureId,
    testCaseName: overrides.testCaseName ?? "Artifact fixture",
    inputVariables: overrides.inputVariables ?? { goal: "Spanish coffee chat", transcriptTurns: "3" },
    variantId: "default",
    variantName: "Default variant",
    status: overrides.status ?? "passed",
    output: overrides.output ?? JSON.stringify({ goalSummary: "Spanish coffee chat" }),
    outputPreview: overrides.outputPreview ?? "Spanish coffee chat artifact",
    metrics: overrides.metrics ?? {
      latencyMs: { value: 15, reported: true },
      tokenCount: { value: null, reported: false },
      costUsd: { value: null, reported: false },
    },
    assertions: overrides.assertions ?? [
      { id: "captures-goal", label: "captures goal", status: "passed" },
    ],
    diagnostics: overrides.diagnostics ?? [],
    artifacts: overrides.artifacts ?? [],
  };
}

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
