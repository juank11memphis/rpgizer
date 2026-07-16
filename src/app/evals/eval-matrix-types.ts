import type {
  EvalAssertion,
  EvalCellArtifact,
  EvalCellMetrics,
  EvalCellStatus,
  EvalDiagnostic,
  EvalPromptModelVariant,
  EvalTestCase,
} from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import type { EvalSuiteSummary } from "@/modules/product-quality-evaluation/domain/eval-suite";

export type EvalMatrixSuite = EvalSuiteSummary & {
  selected: boolean;
};

export type EvalMatrixShellStatus =
  | "ready"
  | "running"
  | "passed"
  | "failed"
  | "blocked"
  | "error";

export type EvalMatrixAction = {
  label: "Run eval" | "Run again" | "Check again" | "Try again" | "Running...";
  disabled: boolean;
};

export type EvalMatrixSummaryStat = {
  label: "Pass rate" | "Avg latency" | "Total cost" | "Progress";
  value: string;
  tone: "neutral" | "success" | "danger" | "warning" | "running";
};

export type EvalMatrixFilters = {
  failuresOnlyLabel: "Failures only";
  searchLabel: "Search test cases or variables";
  searchPlaceholder: "Search test cases..." | "Search test cases or variables...";
  variantLabel: "Variant";
};

export type EvalMatrixProgress = {
  completed: number;
  total: number;
  label: string;
};

export type EvalMatrixCellDetail = {
  outputMarkdown: string;
  assertions: EvalAssertion[];
  diagnostics: EvalDiagnostic[];
  metrics: EvalCellMetrics;
  expectedGolden?: string;
  artifacts: EvalCellArtifact[];
};

export type EvalMatrixShellCell = {
  id: string;
  testCaseId: string;
  testCaseName: string;
  testCaseInputSummary: string;
  variantId: string;
  variantName: string;
  status: EvalCellStatus;
  statusLabel: string;
  assertionSummary: string;
  metricSummary: string;
  diagnosticsSummary: string;
  outputPreview: string;
  detail?: EvalMatrixCellDetail;
};

export type EvalMatrixTestCaseRow = {
  testCase: EvalTestCase;
  inputSummary: string;
  cells: EvalMatrixShellCell[];
};

export type EvalCellSelection = {
  testCaseId: string;
  variantId: string;
};

export type EvalMatrixViewModel = {
  title: "Local Eval Matrix";
  eyebrow: "Local Product Quality Evaluation";
  suites: EvalMatrixSuite[];
  selectedSuite: EvalMatrixSuite;
  availableCountLabel: string;
  status: EvalMatrixShellStatus;
  statusLabel: string;
  statusMessage: string;
  action: EvalMatrixAction;
  summaryStats: EvalMatrixSummaryStat[];
  filters: EvalMatrixFilters;
  variants: EvalPromptModelVariant[];
  rows: EvalMatrixTestCaseRow[];
  diagnostics: EvalDiagnostic[];
  blockerMessage?: string;
  matrixUnavailableMessage?: "Matrix unavailable until configuration is ready.";
  progress: EvalMatrixProgress;
};
