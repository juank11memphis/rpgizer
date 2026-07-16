import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";
import { serverLogger } from "@/server/logging/logger";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

export type RunEvalSuiteActionResult = EvalRunResult;

export type RunEvalSuiteActionScope = {
  testCaseId?: string;
};

type RunEvalSuite = (input: { suiteId: string; testCaseId?: string }) => Promise<EvalRunResult>;
type LocalEvalGuard = () => boolean;
type ActionLogger = Pick<typeof serverLogger, "info" | "warn" | "error">;

export type RunEvalSuiteActionCoreDependencies = {
  isLocalEvalDashboardEnabled: LocalEvalGuard;
  runEvalSuite: RunEvalSuite;
  logger?: ActionLogger;
  now?: () => number;
};

export async function runEvalSuiteActionCore(
  suiteId: string,
  scope: RunEvalSuiteActionScope,
  dependencies: RunEvalSuiteActionCoreDependencies,
): Promise<RunEvalSuiteActionResult> {
  const logger = dependencies.logger ?? serverLogger;
  const now = dependencies.now ?? Date.now;
  const startedAt = now();

  if (!dependencies.isLocalEvalDashboardEnabled()) {
    const result: RunEvalSuiteActionResult = {
      suiteId,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      diagnostics: [
        {
          scope: "configuration",
          code: "local_eval_dashboard_disabled",
          message: "The Arcane Eval Console is only available in local development.",
        },
      ],
      blocker: "local_eval_dashboard_disabled",
      durationMs: now() - startedAt,
    };
    logActionOutcome(logger, result, APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_BLOCKED, scope);
    return result;
  }

  logger.info(
    {
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_STARTED,
      flow: "local_eval_dashboard",
      operation: "run_eval_suite_action",
      suiteId,
      ...summarizeScopeForLog(scope),
    },
    "Local eval suite server action started.",
  );

  try {
    const runInput = scope.testCaseId ? { suiteId, testCaseId: scope.testCaseId } : { suiteId };
    const result = await dependencies.runEvalSuite(runInput);
    logActionOutcome(logger, result, eventForResult(result), scope);
    return result;
  } catch (error) {
    const errorName = error instanceof Error ? error.name || "Error" : "NonErrorThrownValue";
    const result: RunEvalSuiteActionResult = {
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
      durationMs: now() - startedAt,
      errorName,
    };
    logActionOutcome(logger, result, APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR, scope);
    return result;
  }
}

function eventForResult(result: RunEvalSuiteActionResult): string {
  if (result.status === "blocked") {
    return APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_BLOCKED;
  }

  if (result.status === "error") {
    return APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR;
  }

  return APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_COMPLETED;
}

function logActionOutcome(
  logger: ActionLogger,
  result: RunEvalSuiteActionResult,
  event: string,
  scope: RunEvalSuiteActionScope,
): void {
  const logMethod =
    result.status === "passed"
      ? logger.info
      : result.status === "failed" || result.status === "blocked"
        ? logger.warn
        : logger.error;
  const matrixMetadata = summarizeMatrixForLog(result);

  const payload = {
    event,
    flow: "local_eval_dashboard",
    operation: "run_eval_suite_action",
    suiteId: result.suiteId,
    ...summarizeScopeForLog(scope),
    outcome: result.status,
    diagnosticCount: result.diagnostics.length,
    durationMs: result.durationMs,
    ...matrixMetadata,
    ...(result.status === "error"
      ? { error: { name: result.errorName ?? result.errorCode ?? "EvalRunError" } }
      : {}),
    ...(result.status === "blocked" ? { blocker: result.blocker } : {}),
  };

  logMethod.call(logger, payload, "Local eval suite server action completed.");
}

function summarizeScopeForLog(scope: RunEvalSuiteActionScope): {
  runScope: "all" | "test_case";
  testCaseId?: string;
} {
  if (scope.testCaseId) {
    return { runScope: "test_case", testCaseId: scope.testCaseId };
  }

  return { runScope: "all" };
}

function summarizeMatrixForLog(result: RunEvalSuiteActionResult): {
  testCaseCount?: number;
  variantCount?: number;
  failedCellCount?: number;
} {
  if (!result.matrix) {
    return {};
  }

  return {
    testCaseCount: result.matrix.testCases.length,
    variantCount: result.matrix.variants.length,
    failedCellCount: result.matrix.cells.filter((cell) => cell.status === "failed").length,
  };
}
