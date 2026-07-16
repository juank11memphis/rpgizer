"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import type { EvalCellSelection, EvalMatrixViewModel } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createRunningEvalMatrixViewModel,
  filterEvalMatrixRows,
  findEvalMatrixCell,
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
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleVariantIds, setVisibleVariantIds] = useState(() => initialViewModel.variants.map((variant) => variant.id));
  const [selectedCellKey, setSelectedCellKey] = useState<EvalCellSelection | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRunSelectedEval() {
    if (isPending || viewModel.action.disabled) {
      return;
    }

    const suiteId = viewModel.selectedSuite.id;
    setSelectedCellKey(null);
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

  useEffect(() => {
    if (!selectedCellKey) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCellKey(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCellKey]);

  const screenViewModel: EvalMatrixViewModel = isPending
    ? {
        ...viewModel,
        action: { label: "Running...", disabled: true },
      }
    : viewModel;

  const effectiveVisibleVariantIds = useMemo(() => {
    const availableVariantIds = screenViewModel.variants.map((variant) => variant.id);
    const stillVisibleVariantIds = visibleVariantIds.filter((variantId) => availableVariantIds.includes(variantId));
    return stillVisibleVariantIds.length > 0 ? stillVisibleVariantIds : availableVariantIds.slice(0, 1);
  }, [screenViewModel.variants, visibleVariantIds]);

  const filteredRows = useMemo(
    () => filterEvalMatrixRows({ rows: screenViewModel.rows, failuresOnly, searchQuery, visibleVariantIds: effectiveVisibleVariantIds }),
    [screenViewModel.rows, failuresOnly, searchQuery, effectiveVisibleVariantIds],
  );
  const selectedCell = findEvalMatrixCell(screenViewModel.rows, selectedCellKey);

  return (
    <EvalMatrixScreen
      viewModel={{ ...screenViewModel, rows: filteredRows }}
      onRunSelectedEval={handleRunSelectedEval}
      failuresOnly={failuresOnly}
      searchQuery={searchQuery}
      visibleVariantIds={effectiveVisibleVariantIds}
      selectedCell={selectedCell}
      onFailuresOnlyChange={setFailuresOnly}
      onSearchQueryChange={setSearchQuery}
      onVisibleVariantIdsChange={setVisibleVariantIds}
      onSelectCell={setSelectedCellKey}
      onCloseCellDetail={() => setSelectedCellKey(null)}
    />
  );
}
