import type { EvalSuiteSummary } from "@/modules/product-quality-evaluation/domain/eval-suite";
import type { EvalDiagnostic } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

export type EvalConsoleSuite = EvalSuiteSummary & {
  selected: boolean;
};

export type EvalConsoleStatus =
  | "ready"
  | "running"
  | "passed"
  | "failed"
  | "blocked"
  | "error";

export type EvalConsoleViewModel = {
  suites: EvalConsoleSuite[];
  selectedSuite: EvalConsoleSuite;
  availableCountLabel: string;
  status: EvalConsoleStatus;
  statusLabel: string;
  statusMessage: string;
  actionLabel: string;
  actionDisabled: boolean;
  diagnosticsTitle: "Diagnostics" | "Configuration";
  diagnosticsMessage?: string;
  diagnostics: EvalDiagnostic[];
};
