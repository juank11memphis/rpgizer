import type { EvalSuiteSummary } from "@/modules/product-quality-evaluation/domain/eval-suite";

export type EvalConsoleSuite = EvalSuiteSummary & {
  selected: boolean;
};

export type ReadyEvalConsoleViewModel = {
  suites: EvalConsoleSuite[];
  selectedSuite: EvalConsoleSuite;
  availableCountLabel: string;
  status: "Ready";
  statusMessage: string;
  diagnosticsMessage: string;
};
