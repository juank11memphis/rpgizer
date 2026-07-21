import type {
  EvalCell,
  EvalDiagnostic,
  EvalMatrix,
  EvalPromptModelVariant,
  EvalRunAggregates,
  EvalTestCase,
} from "./eval-matrix";

export const GAME_MASTER_INTERVIEW_EVAL_SUITE_ID = "game-master-interview";
export const INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID = "interview-output-artifact";
export const GENERATE_ADVENTURE_EVAL_SUITE_ID = "generate-adventure";
export const ADVENTURE_CONTENT_EVAL_SUITE_ID = "adventure-content";
export const ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID = "adventure-dependency-linking";
export const ADVENTURE_XP_BALANCING_EVAL_SUITE_ID = "adventure-xp-balancing";

export const EVAL_SUITE_IDS = [
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  ADVENTURE_CONTENT_EVAL_SUITE_ID,
  ADVENTURE_DEPENDENCY_LINKING_EVAL_SUITE_ID,
  ADVENTURE_XP_BALANCING_EVAL_SUITE_ID,
] as const;

export type EvalSuiteId = (typeof EVAL_SUITE_IDS)[number];

export type EvalSuiteReadyTestCase = {
  id: string;
  name: string;
  inputVariables: Record<string, string>;
};

export type EvalSuiteSummary = {
  id: EvalSuiteId;
  name: string;
  shortDescription: string;
  purpose: string;
  readyTestCases: EvalSuiteReadyTestCase[];
  defaultVariantLabel: string;
  defaultModelLabel: string;
};

export type EvalSuiteTestCase = EvalTestCase;

export type EvalSuiteRunInput = {
  testCaseId?: string;
};

export type EvalSuiteRunStatus = "passed" | "failed" | "blocked" | "error";

export type EvalSuiteRunResult = {
  status: EvalSuiteRunStatus;
  summary: string;
  diagnostics: EvalDiagnostic[];
  durationMs: number;
  matrix?: EvalMatrix;
  aggregates?: EvalRunAggregates;
  blocker?: string;
  errorName?: string;
};

export type EvalSuiteDefinition = EvalSuiteSummary & {
  variants: EvalPromptModelVariant[];
  testCases: EvalSuiteTestCase[];
  run(input: EvalSuiteRunInput): Promise<EvalSuiteRunResult>;
};

export function isEvalSuiteId(suiteId: string): suiteId is EvalSuiteId {
  return EVAL_SUITE_IDS.includes(suiteId as EvalSuiteId);
}

export function cloneEvalSuiteSummary(suite: EvalSuiteSummary): EvalSuiteSummary {
  return {
    ...suite,
    readyTestCases: suite.readyTestCases.map(cloneReadyTestCase),
  };
}

export function cloneEvalSuiteTestCase(testCase: EvalSuiteTestCase): EvalSuiteTestCase {
  return {
    ...testCase,
    inputVariables: { ...testCase.inputVariables },
  };
}

function cloneReadyTestCase(testCase: EvalSuiteReadyTestCase): EvalSuiteReadyTestCase {
  return {
    ...testCase,
    inputVariables: { ...testCase.inputVariables },
  };
}

export function cloneEvalCell(cell: EvalCell): EvalCell {
  return {
    ...cell,
    metrics: {
      latency: { ...cell.metrics.latency },
      tokens: { ...cell.metrics.tokens },
      cost: { ...cell.metrics.cost },
    },
    assertions: cell.assertions.map((assertion) => ({ ...assertion })),
    diagnostics: cell.diagnostics.map((diagnostic) => ({ ...diagnostic })),
    artifacts: cell.artifacts.map((artifact) => ({ ...artifact })),
  };
}
