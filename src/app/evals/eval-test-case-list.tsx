import type { KeyboardEvent } from "react";

import type { EvalCellSelection, EvalMatrixShellCell, EvalMatrixTestCaseRow } from "./eval-matrix-types";
import type { EvalMatrixCellNavigationDirection } from "./eval-matrix-view-model";

type EvalTestCaseListProps = {
  rows: EvalMatrixTestCaseRow[];
  isRunDisabled: boolean;
  onRunTestCase: (testCaseId: string) => void;
  onSelectCell: (selection: EvalCellSelection, mode: "stacked-list") => void;
  onCellButtonRef: (selection: EvalCellSelection, mode: "stacked-list", element: HTMLButtonElement | null) => void;
  onCellArrowNavigation: (selection: EvalCellSelection, direction: EvalMatrixCellNavigationDirection, mode: "stacked-list") => void;
};

export function EvalTestCaseList({
  rows,
  isRunDisabled,
  onRunTestCase,
  onSelectCell,
  onCellButtonRef,
  onCellArrowNavigation,
}: EvalTestCaseListProps) {
  return (
    <section aria-label="Phone Test Cases" className="flex flex-col gap-2 md:hidden" data-layout="stacked-list">
      <h2 className="px-1 text-sm font-semibold text-slate-200">Test Cases</h2>
      {rows.map((row) => (
        <article key={row.testCase.id} className="border border-slate-800 bg-slate-900/75 p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-sm font-semibold text-slate-100">{row.testCase.name}</p>
            <button
              type="button"
              onClick={() => onRunTestCase(row.testCase.id)}
              disabled={isRunDisabled}
              className="min-h-8 shrink-0 border border-slate-700 px-2 text-xs font-semibold text-blue-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
              aria-label={`Run only ${row.testCase.name}`}
            >
              Run row
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">{row.inputSummary}</p>
          {row.cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              ref={(element) => onCellButtonRef(toCellSelection(cell), "stacked-list", element)}
              onClick={() => onSelectCell(toCellSelection(cell), "stacked-list")}
              onKeyDown={(event) => handleCellKeyDown(event, cell, onCellArrowNavigation)}
              className={`mt-3 flex w-full flex-col gap-1 border-t pt-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-200 ${cellListClassName(cell)}`}
              aria-label={`Open ${cell.testCaseName} ${cell.variantName} detail: ${cell.statusLabel}. Press Enter or Space to open.`}
            >
              <span className="text-sm font-semibold text-slate-100">
                {cell.statusLabel} · {cell.assertionSummary}
              </span>
              <span className="text-xs text-slate-500">{cell.metricSummary}</span>
              <span className="font-mono text-xs text-slate-300">{cell.outputPreview}</span>
              <span className="text-xs text-slate-500">{cell.diagnosticsSummary}</span>
            </button>
          ))}
        </article>
      ))}
    </section>
  );
}

function cellListClassName(cell: EvalMatrixShellCell): string {
  if (cell.status === "failed" || cell.status === "error") {
    return "border-rose-500/50";
  }

  if (cell.status === "passed") {
    return "border-emerald-500/40";
  }

  return "border-slate-800";
}


function handleCellKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  cell: EvalMatrixShellCell,
  onCellArrowNavigation: EvalTestCaseListProps["onCellArrowNavigation"],
) {
  const direction = getStackedListArrowDirection(event.key);

  if (!direction) {
    return;
  }

  event.preventDefault();
  onCellArrowNavigation(toCellSelection(cell), direction, "stacked-list");
}

function getStackedListArrowDirection(key: string): EvalMatrixCellNavigationDirection | null {
  if (key === "ArrowUp") {
    return "up";
  }

  if (key === "ArrowDown") {
    return "down";
  }

  return null;
}

function toCellSelection(cell: EvalMatrixShellCell): EvalCellSelection {
  return { testCaseId: cell.testCaseId, variantId: cell.variantId };
}
