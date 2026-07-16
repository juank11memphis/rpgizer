"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import type { EvalCellSelection, EvalMatrixViewModel } from "./eval-matrix-types";
import {
  createEvalMatrixViewModelFromRunResult,
  createRunningEvalMatrixViewModel,
  filterEvalMatrixRows,
  findEvalMatrixCell,
  findNextEvalMatrixCellSelection,
  type EvalMatrixCellNavigationDirection,
  type EvalMatrixCellNavigationMode,
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
  const cellButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusRestoreKeyRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRunSelectedEval() {
    if (isPending || viewModel.action.disabled) {
      return;
    }

    const suiteId = viewModel.selectedSuite.id;
    setSelectedCellKey(null);
    pendingFocusRestoreKeyRef.current = null;
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
    if (selectedCellKey || !pendingFocusRestoreKeyRef.current) {
      return;
    }

    const focusRestoreKey = pendingFocusRestoreKeyRef.current;
    pendingFocusRestoreKeyRef.current = null;

    window.requestAnimationFrame(() => {
      cellButtonRefs.current.get(focusRestoreKey)?.focus();
    });
  }, [selectedCellKey]);

  function handleCellButtonRef(
    selection: EvalCellSelection,
    mode: EvalMatrixCellNavigationMode,
    element: HTMLButtonElement | null,
  ) {
    const key = createCellButtonKey(selection, mode);

    if (element) {
      cellButtonRefs.current.set(key, element);
      return;
    }

    cellButtonRefs.current.delete(key);
  }

  function handleSelectCell(selection: EvalCellSelection, mode: EvalMatrixCellNavigationMode) {
    pendingFocusRestoreKeyRef.current = createCellButtonKey(selection, mode);
    setSelectedCellKey(selection);
  }

  function handleCloseCellDetail() {
    if (selectedCellKey) {
      pendingFocusRestoreKeyRef.current = pendingFocusRestoreKeyRef.current ?? createCellKey(selectedCellKey);
    }

    setSelectedCellKey(null);
  }

  function handleCellArrowNavigation(
    selection: EvalCellSelection,
    direction: EvalMatrixCellNavigationDirection,
    mode: EvalMatrixCellNavigationMode,
  ) {
    const nextSelection = findNextEvalMatrixCellSelection({
      rows: filteredRows,
      current: selection,
      direction,
      mode,
    });

    if (!nextSelection) {
      return;
    }

    cellButtonRefs.current.get(createCellButtonKey(nextSelection, mode))?.focus();
  }

  const screenViewModel: EvalMatrixViewModel = isPending
    ? {
        ...viewModel,
        action: { label: "Running...", disabled: true },
      }
    : viewModel;

  const availableVariantIds = screenViewModel.variants.map((variant) => variant.id);
  const stillVisibleVariantIds = visibleVariantIds.filter((variantId) => availableVariantIds.includes(variantId));
  const effectiveVisibleVariantIds = stillVisibleVariantIds.length > 0
    ? stillVisibleVariantIds
    : availableVariantIds.slice(0, 1);
  const filteredRows = filterEvalMatrixRows({
    rows: screenViewModel.rows,
    failuresOnly,
    searchQuery,
    visibleVariantIds: effectiveVisibleVariantIds,
  });
  const selectedCell = findEvalMatrixCell(screenViewModel.rows, selectedCellKey);
  const visibleVariants = screenViewModel.variants.filter((variant) => effectiveVisibleVariantIds.includes(variant.id));

  return (
    <EvalMatrixScreen
      viewModel={{ ...screenViewModel, variants: visibleVariants, rows: filteredRows }}
      onRunSelectedEval={handleRunSelectedEval}
      failuresOnly={failuresOnly}
      searchQuery={searchQuery}
      visibleVariantIds={effectiveVisibleVariantIds}
      selectedCell={selectedCell}
      onFailuresOnlyChange={setFailuresOnly}
      onSearchQueryChange={setSearchQuery}
      onVisibleVariantIdsChange={setVisibleVariantIds}
      onSelectCell={handleSelectCell}
      onCloseCellDetail={handleCloseCellDetail}
      onCellButtonRef={handleCellButtonRef}
      onCellArrowNavigation={handleCellArrowNavigation}
    />
  );
}

function createCellKey(selection: EvalCellSelection): string {
  return `${selection.testCaseId}::${selection.variantId}`;
}

function createCellButtonKey(selection: EvalCellSelection, mode: EvalMatrixCellNavigationMode): string {
  return `${mode}::${createCellKey(selection)}`;
}
