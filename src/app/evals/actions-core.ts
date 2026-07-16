import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";
import { serverLogger } from "@/server/logging/logger";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

export type RunEvalSuiteActionResult = EvalRunResult;

type RunEvalSuite = (input: { suiteId: string }) => Promise<EvalRunResult>;
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
    logActionOutcome(logger, result, APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_BLOCKED);
    return result;
  }

  logger.info(
    {
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_STARTED,
      flow: "local_eval_dashboard",
      operation: "run_eval_suite_action",
      suiteId,
    },
    "Local eval suite server action started.",
  );

  try {
    const result = await dependencies.runEvalSuite({ suiteId });
    logActionOutcome(logger, result, eventForResult(result));
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
    logActionOutcome(logger, result, APPLICATION_LOG_EVENTS.SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR);
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
): void {
  const logMethod = result.status === "passed" ? logger.info : result.status === "failed" || result.status === "blocked" ? logger.warn : logger.error;

  logMethod.call(
    logger,
    {
      event,
      flow: "local_eval_dashboard",
      operation: "run_eval_suite_action",
      suiteId: result.suiteId,
      outcome: result.status,
      diagnosticCount: result.diagnostics.length,
      durationMs: result.durationMs,
      error: result.status === "error" ? { name: result.errorName ?? result.errorCode ?? "EvalRunError" } : undefined,
      blocker: result.status === "blocked" ? result.blocker : undefined,
    },
    "Local eval suite server action completed.",
  );
}
