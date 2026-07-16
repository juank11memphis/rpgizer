"use client";

import { useState, useTransition } from "react";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import type { EvalMatrixViewModel } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createRunningEvalMatrixViewModel,
} from "./eval-matrix-view-model";

type EvalMatrixClientProps = {
  initialViewModel: EvalMatrixViewModel;
  runSelectedEvalSuite: (suiteId: string) => Promise<EvalRunResult>;
};

export function EvalMatrixClient({
  initialViewModel,
  runSelectedEvalSuite,
}: EvalMatrixClientProps) {
  const [viewModel, setViewModel] = useState(initialViewModel);
  const [isPending, startTransition] = useTransition();

  function handleRunSelectedEval() {
    if (isPending || viewModel.action.disabled) {
      return;
    }

    const suiteId = viewModel.selectedSuite.id;
    setViewModel((currentViewModel) => createRunningEvalMatrixViewModel(currentViewModel));

    startTransition(async () => {
      try {
        const result = await runSelectedEvalSuite(suiteId);
        setViewModel((currentViewModel) =>
          createEvalMatrixViewModelFromRunResult(currentViewModel, result),
        );
      } catch {
        setViewModel((currentViewModel) =>
          createEvalMatrixViewModelFromRunResult(currentViewModel, {
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

  const screenViewModel: EvalMatrixViewModel = isPending
    ? {
        ...viewModel,
        action: { label: "Running...", disabled: true },
      }
    : viewModel;

  return <EvalMatrixScreen viewModel={screenViewModel} onRunSelectedEval={handleRunSelectedEval} />;
}
