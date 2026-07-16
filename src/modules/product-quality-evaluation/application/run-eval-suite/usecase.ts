import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteId,
} from "../../domain/eval-suite";
import {
  buildEvalRunAggregates,
  createUnreportedEvalCellMetrics,
  type EvalCell,
  type EvalDiagnostic,
  type EvalMatrix,
  type EvalPromptModelVariant,
  type EvalTestCase,
} from "../../domain/eval-matrix";
import type { RunEvalSuiteInput } from "./input";
import type { EvalRunResult } from "./output";
import type { GameMasterInterviewEvalRunResult } from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";

export type GameMasterInterviewEvalRunner = () => Promise<GameMasterInterviewEvalRunResult>;

export type RunEvalSuiteDependencies = {
  runGameMasterInterviewEvals: GameMasterInterviewEvalRunner;
};

const DEFAULT_VARIANT: EvalPromptModelVariant = {
  id: "default",
  name: "Default variant",
  promptLabel: "Default prompt",
  modelLabel: "Default model",
};

export async function runEvalSuite(
  input: RunEvalSuiteInput,
  dependencies: RunEvalSuiteDependencies,
): Promise<EvalRunResult> {
  const startedAt = Date.now();

  if (input.suiteId !== GAME_MASTER_INTERVIEW_EVAL_SUITE_ID) {
    return {
      suiteId: input.suiteId,
      status: "error",
      summary: "Unknown eval suite.",
      diagnostics: [
        {
          scope: "run",
          code: "unknown_eval_suite",
          message: "The selected eval suite is not available.",
        },
      ],
      durationMs: Date.now() - startedAt,
      errorCode: "unknown_eval_suite",
    };
  }

  try {
    const result = await dependencies.runGameMasterInterviewEvals();
    return normalizeGameMasterInterviewResult(GAME_MASTER_INTERVIEW_EVAL_SUITE_ID, result);
  } catch (error) {
    return normalizeUnexpectedError(input.suiteId, error, Date.now() - startedAt);
  }
}

function normalizeGameMasterInterviewResult(
  suiteId: EvalSuiteId,
  result: GameMasterInterviewEvalRunResult,
): EvalRunResult {
  if (result.status === "passed") {
    const matrix = buildMatrix(result.fixtureIds, []);

    return {
      suiteId,
      status: "passed",
      summary: "Game Master Interview Evals passed.",
      diagnostics: [],
      durationMs: result.durationMs,
      matrix,
      aggregates: buildEvalRunAggregates(matrix),
    };
  }

  if (result.status === "failed") {
    const diagnostics = result.diagnostics.map((diagnostic) => ({
      scope: "fixture" as const,
      fixtureId: diagnostic.fixtureId,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    }));
    const matrix = buildMatrix(result.fixtureIds, diagnostics);

    return {
      suiteId,
      status: "failed",
      summary: "Some fixtures need attention.",
      diagnostics,
      durationMs: result.durationMs,
      matrix,
      aggregates: buildEvalRunAggregates(matrix),
    };
  }

  if (result.status === "blocked") {
    return {
      suiteId,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      diagnostics: result.diagnostics.map((diagnostic) => ({
        scope: "configuration",
        code: result.blocker,
        message: sanitizeDiagnosticMessage(diagnostic.message),
      })),
      blocker: result.blocker,
      durationMs: result.durationMs,
    };
  }

  return {
    suiteId,
    status: "error",
    summary: "The eval did not finish.",
    diagnostics: result.diagnostics.map((diagnostic) => ({
      scope: "run",
      message: sanitizeDiagnosticMessage(diagnostic.message),
      code: diagnostic.errorName,
    })),
    durationMs: result.durationMs,
    errorName: result.diagnostics[0]?.errorName,
  };
}

function normalizeUnexpectedError(
  suiteId: EvalSuiteId | string,
  error: unknown,
  durationMs: number,
): EvalRunResult {
  const errorName = error instanceof Error ? error.name || "Error" : "NonErrorThrownValue";

  return {
    suiteId,
    status: "error",
    summary: "The eval did not finish.",
    diagnostics: [
      {
        scope: "run",
        code: errorName,
        message: "The eval could not finish. Try again after checking local setup.",
      },
    ],
    durationMs,
    errorName,
  };
}

function buildMatrix(fixtureIds: string[], diagnostics: EvalDiagnostic[]): EvalMatrix {
  const testCases = buildTestCases(fixtureIds, diagnostics);

  return {
    testCases,
    variants: [DEFAULT_VARIANT],
    cells: testCases.map((testCase) => buildCell(testCase, diagnostics)),
  };
}

function buildTestCases(fixtureIds: string[], diagnostics: EvalDiagnostic[]): EvalTestCase[] {
  const diagnosticFixtureIds = diagnostics
    .map((diagnostic) => diagnostic.fixtureId)
    .filter((fixtureId): fixtureId is string => fixtureId !== undefined && fixtureId.length > 0);
  const testCaseIds = uniquePreservingOrder([...fixtureIds, ...diagnosticFixtureIds]);

  return testCaseIds.map((fixtureId) => ({
    id: fixtureId,
    name: fixtureId,
    inputVariables: {},
  }));
}

function buildCell(testCase: EvalTestCase, diagnostics: EvalDiagnostic[]): EvalCell {
  const cellDiagnostics = diagnostics.filter((diagnostic) => diagnostic.fixtureId === testCase.id);

  return {
    id: `${testCase.id}::${DEFAULT_VARIANT.id}`,
    testCaseId: testCase.id,
    variantId: DEFAULT_VARIANT.id,
    status: cellDiagnostics.length > 0 ? "failed" : "passed",
    outputPreview: null,
    metrics: createUnreportedEvalCellMetrics(),
    assertions: cellDiagnostics.map((diagnostic, index) => ({
      id: `${testCase.id}-diagnostic-${index + 1}`,
      label: "Fixture expectation",
      status: "failed",
      message: diagnostic.message,
    })),
    diagnostics: cellDiagnostics,
    artifacts: [],
  };
}

function uniquePreservingOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function sanitizeDiagnosticMessage(message: string): string {
  const trimmed = message.trim();
  return trimmed.length === 0 ? "No safe diagnostic details were available." : trimmed;
}
