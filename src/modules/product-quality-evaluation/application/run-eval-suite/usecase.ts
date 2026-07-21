import {
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  isEvalSuiteId,
  type EvalSuiteId,
} from "../../domain/eval-suite";
import {
  buildEvalRunAggregates,
  createUnreportedEvalCellMetrics,
  createUnreportedMetricValue,
  type EvalAssertion,
  type EvalCell,
  type EvalCellArtifact,
  type EvalCellMetrics,
  type EvalCellStatus,
  type EvalMatrix,
  type EvalPromptModelVariant,
  type EvalTestCase,
} from "../../domain/eval-matrix";
import type { RunEvalSuiteInput } from "./input";
import type { EvalRunResult } from "./output";
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

export type GameMasterInterviewEvalRunner = (input?: { testCaseId?: string }) => Promise<GameMasterInterviewEvalRunResult>;
export type InterviewOutputArtifactEvalRunner = (input?: { testCaseId?: string }) => Promise<InterviewOutputArtifactEvalRunResult>;
export type GenerateAdventureEvalRunner = (input?: { testCaseId?: string }) => Promise<GenerateAdventureEvalRunResult>;
export type FocusedAdventureStepEvalRunner = (input?: { testCaseId?: string }) => Promise<FocusedAdventureStepRunResult>;

export type RunEvalSuiteDependencies = {
  runGameMasterInterviewEvals: GameMasterInterviewEvalRunner;
  runInterviewOutputArtifactEvals: InterviewOutputArtifactEvalRunner;
  runGenerateAdventureEvals: GenerateAdventureEvalRunner;
  runAdventureContentEvals: FocusedAdventureStepEvalRunner;
  runAdventureLinkingEvals: FocusedAdventureStepEvalRunner;
  runAdventureXpEvals: FocusedAdventureStepEvalRunner;
};

type StructuredEvalCell = GameMasterInterviewEvalCell | InterviewOutputArtifactEvalCell;
type StructuredEvalRunResult = GameMasterInterviewEvalRunResult | InterviewOutputArtifactEvalRunResult;
type AdventurePlannerEvalRunResult = GenerateAdventureEvalRunResult | FocusedAdventureStepRunResult;
type AdventurePlannerDiagnostic = AdventurePlannerEvalRunResult["diagnostics"][number];

const DEFAULT_VARIANT: EvalPromptModelVariant = {
  id: "default",
  name: "Default variant",
  promptLabel: "Default prompt",
  modelLabel: "Default model",
};

const STRUCTURED_SUITE_PASSED_SUMMARY: Record<typeof GAME_MASTER_INTERVIEW_EVAL_SUITE_ID | typeof INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID, string> = {
  [GAME_MASTER_INTERVIEW_EVAL_SUITE_ID]: "Game Master Interview Evals passed.",
  [INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID]: "Interview Output Artifact Evals passed.",
};

const ADVENTURE_SUITE_LABELS: Record<
  typeof GENERATE_ADVENTURE_EVAL_SUITE_ID | typeof ADVENTURE_CONTENT_EVAL_SUITE_ID | typeof ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID | typeof ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
  string
> = {
  [GENERATE_ADVENTURE_EVAL_SUITE_ID]: "Generate Adventure",
  [ADVENTURE_CONTENT_EVAL_SUITE_ID]: "Adventure Content",
  [ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID]: "Adventure Dependency Links",
  [ADVENTURE_XP_BALANCING_EVAL_SUITE_ID]: "Adventure XP Balance",
};

export async function runEvalSuite(
  input: RunEvalSuiteInput,
  dependencies: RunEvalSuiteDependencies,
): Promise<EvalRunResult> {
  const startedAt = Date.now();

  if (!isEvalSuiteId(input.suiteId)) {
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

  const knownInput: RunEvalSuiteInput & { suiteId: EvalSuiteId } = {
    ...input,
    suiteId: input.suiteId,
  };

  try {
    return await runKnownEvalSuite(knownInput, dependencies, startedAt);
  } catch (error) {
    return normalizeUnexpectedError(knownInput.suiteId, error, Date.now() - startedAt);
  }
}

async function runKnownEvalSuite(
  input: RunEvalSuiteInput & { suiteId: EvalSuiteId },
  dependencies: RunEvalSuiteDependencies,
  startedAt: number,
): Promise<EvalRunResult> {
  if (input.suiteId === GAME_MASTER_INTERVIEW_EVAL_SUITE_ID) {
    const result = await dependencies.runGameMasterInterviewEvals(buildScopedRunnerInput(input.testCaseId));
    return normalizeStructuredResult(input.suiteId, result);
  }

  if (input.suiteId === INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID) {
    const result = await dependencies.runInterviewOutputArtifactEvals(buildScopedRunnerInput(input.testCaseId));
    return normalizeStructuredResult(input.suiteId, result);
  }

  if (input.suiteId === GENERATE_ADVENTURE_EVAL_SUITE_ID) {
    const result = await dependencies.runGenerateAdventureEvals(buildScopedRunnerInput(input.testCaseId));
    return normalizeAdventurePlannerResult(input.suiteId, result, Date.now() - startedAt);
  }

  if (input.suiteId === ADVENTURE_CONTENT_EVAL_SUITE_ID) {
    const result = await dependencies.runAdventureContentEvals(buildScopedRunnerInput(input.testCaseId));
    return normalizeAdventurePlannerResult(input.suiteId, result, Date.now() - startedAt);
  }

  if (input.suiteId === ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID) {
    const result = await dependencies.runAdventureLinkingEvals(buildScopedRunnerInput(input.testCaseId));
    return normalizeAdventurePlannerResult(input.suiteId, result, Date.now() - startedAt);
  }

  const result = await dependencies.runAdventureXpEvals(buildScopedRunnerInput(input.testCaseId));
  return normalizeAdventurePlannerResult(input.suiteId, result, Date.now() - startedAt);
}

function buildScopedRunnerInput(testCaseId: string | undefined): { testCaseId: string } | undefined {
  return testCaseId ? { testCaseId } : undefined;
}

function normalizeStructuredResult(
  suiteId: typeof GAME_MASTER_INTERVIEW_EVAL_SUITE_ID | typeof INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  result: StructuredEvalRunResult,
): EvalRunResult {
  if (result.status === "passed") {
    const matrix = buildMatrixFromStructuredCells(result.cells, { modelLabel: result.modelLabel });

    return {
      suiteId,
      status: "passed",
      summary: STRUCTURED_SUITE_PASSED_SUMMARY[suiteId],
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
      code: "assertionId" in diagnostic ? diagnostic.assertionId : undefined,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    }));
    const matrix = buildMatrixFromStructuredCells(result.cells, { modelLabel: result.modelLabel });

    return {
      suiteId,
      status: "failed",
      summary: "Some Test Cases need attention.",
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

function normalizeAdventurePlannerResult(
  suiteId: keyof typeof ADVENTURE_SUITE_LABELS,
  result: AdventurePlannerEvalRunResult,
  durationMs: number,
): EvalRunResult {
  const configurationDiagnostics = result.diagnostics.filter(isConfigurationDiagnostic);
  if (!result.passed && configurationDiagnostics.length > 0) {
    return {
      suiteId,
      status: "blocked",
      summary: "Local configuration is missing or invalid.",
      diagnostics: configurationDiagnostics.map((diagnostic) => ({
        scope: "configuration",
        code: "configuration",
        message: sanitizeDiagnosticMessage(diagnostic.message),
      })),
      blocker: "configuration",
      durationMs,
    };
  }

  const matrix = buildAdventurePlannerMatrix(suiteId, result);
  const aggregates = buildEvalRunAggregates(matrix);

  if (result.passed) {
    return {
      suiteId,
      status: "passed",
      summary: `${ADVENTURE_SUITE_LABELS[suiteId]} Evals passed.`,
      diagnostics: [],
      durationMs,
      matrix,
      aggregates,
    };
  }

  return {
    suiteId,
    status: "failed",
    summary: "Some Test Cases need attention.",
    diagnostics: result.diagnostics.map((diagnostic) => ({
      scope: "fixture" as const,
      fixtureId: diagnostic.fixtureId,
      code: diagnostic.area,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    })),
    durationMs,
    matrix,
    aggregates,
  };
}

function isConfigurationDiagnostic(diagnostic: AdventurePlannerDiagnostic): boolean {
  return diagnostic.area === "configuration" || diagnostic.fixtureId === "runner";
}

function buildAdventurePlannerMatrix(
  suiteId: keyof typeof ADVENTURE_SUITE_LABELS,
  result: AdventurePlannerEvalRunResult,
): EvalMatrix {
  const fixtureIds = collectAdventureFixtureIds(result);
  const diagnosticsByFixture = groupDiagnosticsByFixture(result.diagnostics);

  return {
    testCases: fixtureIds.map((fixtureId) => buildAdventurePlannerTestCase(fixtureId)),
    variants: [{ ...DEFAULT_VARIANT, promptLabel: ADVENTURE_SUITE_LABELS[suiteId] }],
    cells: fixtureIds.map((fixtureId) => {
      const diagnostics = diagnosticsByFixture.get(fixtureId) ?? [];
      return buildAdventurePlannerCell(fixtureId, diagnostics);
    }),
  };
}

function collectAdventureFixtureIds(result: AdventurePlannerEvalRunResult): string[] {
  const ids = new Set(result.fixtureIds);
  for (const diagnostic of result.diagnostics) {
    if (diagnostic.fixtureId !== "runner") {
      ids.add(diagnostic.fixtureId);
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function groupDiagnosticsByFixture(diagnostics: AdventurePlannerDiagnostic[]): Map<string, AdventurePlannerDiagnostic[]> {
  const grouped = new Map<string, AdventurePlannerDiagnostic[]>();

  for (const diagnostic of diagnostics) {
    if (diagnostic.fixtureId === "runner") {
      continue;
    }

    const existing = grouped.get(diagnostic.fixtureId) ?? [];
    existing.push(diagnostic);
    grouped.set(diagnostic.fixtureId, existing);
  }

  return grouped;
}

function buildAdventurePlannerTestCase(fixtureId: string): EvalTestCase {
  return {
    id: fixtureId,
    name: formatFixtureName(fixtureId),
    inputVariables: { fixtureId },
  };
}

function buildAdventurePlannerCell(fixtureId: string, diagnostics: AdventurePlannerDiagnostic[]): EvalCell {
  const status: EvalCellStatus = diagnostics.length === 0 ? "passed" : "failed";

  return {
    id: `${fixtureId}::default`,
    testCaseId: fixtureId,
    variantId: DEFAULT_VARIANT.id,
    status,
    outputPreview: null,
    outputMarkdown: null,
    metrics: createUnreportedEvalCellMetrics(),
    assertions: diagnostics.length === 0 ? [buildPassedAdventureAssertion(fixtureId)] : diagnostics.map(buildFailedAdventureAssertion),
    diagnostics: diagnostics.map((diagnostic) => ({
      scope: "fixture",
      fixtureId: diagnostic.fixtureId,
      code: diagnostic.area,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    })),
    artifacts: [],
  };
}

function buildPassedAdventureAssertion(fixtureId: string): EvalAssertion {
  return {
    id: `${fixtureId}::quality-checks`,
    label: "Quality checks passed",
    status: "passed",
  };
}

function buildFailedAdventureAssertion(diagnostic: AdventurePlannerDiagnostic): EvalAssertion {
  return {
    id: `${diagnostic.fixtureId}::${diagnostic.area}`,
    label: formatDiagnosticArea(diagnostic.area),
    status: "failed",
    message: sanitizeDiagnosticMessage(diagnostic.message),
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

function buildMatrixFromStructuredCells(
  cells: StructuredEvalCell[],
  options: { modelLabel?: string } = {},
): EvalMatrix {
  return {
    testCases: cells.map(buildTestCase),
    variants: [{ ...DEFAULT_VARIANT, modelLabel: options.modelLabel ?? DEFAULT_VARIANT.modelLabel }],
    cells: cells.map(buildCell),
  };
}

function buildTestCase(cell: StructuredEvalCell): EvalTestCase {
  return {
    id: cell.testCaseId,
    name: cell.testCaseName,
    inputVariables: cell.inputVariables,
  };
}

function buildCell(cell: StructuredEvalCell): EvalCell {
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
      code: "assertionId" in diagnostic ? diagnostic.assertionId : undefined,
      message: sanitizeDiagnosticMessage(diagnostic.message),
    })),
    artifacts: cell.artifacts.map(buildArtifact),
  };
}

function buildCellMetrics(cell: StructuredEvalCell): EvalCellMetrics {
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

function buildArtifact(artifact: StructuredEvalCell["artifacts"][number]): EvalCellArtifact {
  return {
    id: artifact.id,
    label: artifact.label,
    localOnly: true,
    redactionState: artifact.redactionState,
    value: artifact.value,
    preview: artifact.preview,
  };
}

function formatFixtureName(fixtureId: string): string {
  return fixtureId
    .split(/[-_]/u)
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDiagnosticArea(area: string): string {
  return area
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeDiagnosticMessage(message: string): string {
  const trimmed = message.trim();
  return trimmed.length === 0 ? "No safe diagnostic details were available." : trimmed;
}
