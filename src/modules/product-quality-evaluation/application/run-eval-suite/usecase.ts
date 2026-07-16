import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  type EvalSuiteId,
} from "../../domain/eval-suite";
import {
  buildEvalRunAggregates,
  createUnreportedMetricValue,
  type EvalCell,
  type EvalCellArtifact,
  type EvalCellMetrics,
  type EvalMatrix,
  type EvalPromptModelVariant,
  type EvalTestCase,
} from "../../domain/eval-matrix";
import type { RunEvalSuiteInput } from "./input";
import type { EvalRunResult } from "./output";
import type {
  GameMasterInterviewEvalCell,
  GameMasterInterviewEvalRunResult,
} from "@/modules/game-master-assistant/evals/run-game-master-interview-evals";

export type GameMasterInterviewEvalRunner = (input?: { testCaseId?: string }) => Promise<GameMasterInterviewEvalRunResult>;

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
    const runnerInput = input.testCaseId ? { testCaseId: input.testCaseId } : undefined;
    const result = await dependencies.runGameMasterInterviewEvals(runnerInput);
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
    const matrix = buildMatrixFromStructuredCells(result.cells);

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
    const matrix = buildMatrixFromStructuredCells(result.cells);

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

function buildMatrixFromStructuredCells(cells: GameMasterInterviewEvalCell[]): EvalMatrix {
  return {
    testCases: cells.map(buildTestCase),
    variants: [DEFAULT_VARIANT],
    cells: cells.map(buildCell),
  };
}

function buildTestCase(cell: GameMasterInterviewEvalCell): EvalTestCase {
  return {
    id: cell.testCaseId,
    name: cell.testCaseName,
    inputVariables: cell.inputVariables,
  };
}

function buildCell(cell: GameMasterInterviewEvalCell): EvalCell {
  return {
    id: cell.id,
    testCaseId: cell.testCaseId,
    variantId: cell.variantId,
    status: cell.status,
    outputPreview: cell.outputPreview,
    outputMarkdown: cell.output,
    metrics: buildCellMetrics(cell),
    assertions: cell.assertions.map((assertion) => ({
      id: assertion.id,
      label: assertion.label,
      status: assertion.status,
      message: assertion.message === undefined ? undefined : sanitizeDiagnosticMessage(assertion.message),
    })),
    diagnostics: cell.diagnostics.map((diagnostic) => ({
      scope: "fixture" as const,
      fixtureId: diagnostic.fixtureId,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    })),
    artifacts: cell.artifacts.map(buildArtifact),
  };
}

function buildCellMetrics(cell: GameMasterInterviewEvalCell): EvalCellMetrics {
  return {
    latency: cell.metrics.latencyMs.reported && cell.metrics.latencyMs.value !== null
      ? { value: cell.metrics.latencyMs.value, unit: "ms", reported: true }
      : createUnreportedMetricValue("ms"),
    tokens: cell.metrics.tokenCount.reported && cell.metrics.tokenCount.value !== null
      ? { value: cell.metrics.tokenCount.value, unit: "tokens", reported: true }
      : createUnreportedMetricValue("tokens"),
    cost: cell.metrics.costUsd.reported && cell.metrics.costUsd.value !== null
      ? { value: cell.metrics.costUsd.value, unit: "usd", reported: true }
      : createUnreportedMetricValue("usd"),
  };
}

function buildArtifact(artifact: GameMasterInterviewEvalCell["artifacts"][number]): EvalCellArtifact {
  return {
    id: artifact.id,
    label: artifact.label,
    localOnly: true,
    redactionState: artifact.redactionState,
    value: artifact.value,
    preview: artifact.preview,
  };
}

function sanitizeDiagnosticMessage(message: string): string {
  const trimmed = message.trim();
  return trimmed.length === 0 ? "No safe diagnostic details were available." : trimmed;
}
