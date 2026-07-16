"use client";

import { useState, useTransition } from "react";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import { EvalConsoleScreen } from "./eval-console-screen";
import type { EvalConsoleViewModel } from "./eval-console-types";
import {
  createEvalConsoleViewModelFromRunResult,
  createRunningEvalConsoleViewModel,
} from "./eval-console-view-model";

type EvalConsoleClientProps = {
  initialViewModel: EvalConsoleViewModel;
  runSelectedEvalSuite: (suiteId: string) => Promise<EvalRunResult>;
};

export function EvalConsoleClient({
  initialViewModel,
  runSelectedEvalSuite,
}: EvalConsoleClientProps) {
  const [viewModel, setViewModel] = useState(initialViewModel);
  const [isPending, startTransition] = useTransition();

  function handleRunSelectedEval() {
    const suiteId = viewModel.selectedSuite.id;
    setViewModel((currentViewModel) => createRunningEvalConsoleViewModel(currentViewModel));

    startTransition(async () => {
      try {
        const result = await runSelectedEvalSuite(suiteId);
        setViewModel((currentViewModel) =>
          createEvalConsoleViewModelFromRunResult(currentViewModel, result),
        );
      } catch {
        setViewModel((currentViewModel) =>
          createEvalConsoleViewModelFromRunResult(currentViewModel, {
            suiteId,
            status: "error",
            summary: "The eval did not finish.",
            diagnostics: [
              {
                scope: "run",
                code: "server_action_invocation_failed",
                message: "The eval could not finish. Try again after checking local setup.",
              },
            ],
            durationMs: 0,
            errorCode: "server_action_invocation_failed",
          }),
        );
      }
    });
  }

  return (
    <EvalConsoleScreen
      viewModel={{
        ...viewModel,
        actionDisabled: viewModel.actionDisabled || isPending,
        actionLabel: isPending ? "Running…" : viewModel.actionLabel,
      }}
      onRunSelectedEval={handleRunSelectedEval}
    />
  );
}
