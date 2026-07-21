import type { EvalSuiteId, EvalSuiteRunResult } from "../../domain/eval-suite";
import { findRegisteredEvalSuite, type EvalSuiteRegistryDependencies } from "../../evals/registry";
import { normalizeUnexpectedEvalSuiteError } from "./eval-suite-result-normalizers";
import type { RunEvalSuiteInput } from "./input";
import type { EvalRunResult } from "./output";

export type {
  FocusedAdventureStepEvalRunner,
  GameMasterInterviewEvalRunner,
  GenerateAdventureEvalRunner,
  InterviewOutputArtifactEvalRunner,
  EvalSuiteRegistryDependencies as RunEvalSuiteDependencies,
} from "../../evals/registry";

export async function runEvalSuite(
  input: RunEvalSuiteInput,
  dependencies: EvalSuiteRegistryDependencies,
): Promise<EvalRunResult> {
  const startedAt = Date.now();
  const suite = findRegisteredEvalSuite(input.suiteId, dependencies);

  if (!suite) {
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
    const result = await suite.run({ testCaseId: input.testCaseId });
    return addSuiteId(suite.id, result);
  } catch (error) {
    return addSuiteId(suite.id, normalizeUnexpectedEvalSuiteError(error, Date.now() - startedAt));
  }
}

function addSuiteId(suiteId: EvalSuiteId, result: EvalSuiteRunResult): EvalRunResult {
  const matrixFields = {
    ...(result.matrix === undefined ? {} : { matrix: result.matrix }),
    ...(result.aggregates === undefined ? {} : { aggregates: result.aggregates }),
  };

  if (result.status === "passed") {
    return {
      suiteId,
      status: "passed",
      summary: result.summary,
      diagnostics: [],
      durationMs: result.durationMs,
      ...matrixFields,
    };
  }

  if (result.status === "failed") {
    return {
      suiteId,
      status: "failed",
      summary: result.summary,
      diagnostics: result.diagnostics,
      durationMs: result.durationMs,
      ...matrixFields,
    };
  }

  if (result.status === "blocked") {
    return {
      suiteId,
      status: "blocked",
      summary: result.summary,
      diagnostics: result.diagnostics,
      blocker: result.blocker ?? "configuration",
      durationMs: result.durationMs,
      ...matrixFields,
    };
  }

  return {
    suiteId,
    status: "error",
    summary: result.summary,
    diagnostics: result.diagnostics,
    durationMs: result.durationMs,
    errorName: result.errorName,
    ...matrixFields,
  };
}
