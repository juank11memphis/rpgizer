import type { EvalPromptModelVariant } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import type { KeyboardEvent } from "react";

import type { EvalCellSelection, EvalMatrixShellCell, EvalMatrixTestCaseRow } from "./eval-matrix-types";
import type { EvalMatrixCellNavigationDirection } from "./eval-matrix-view-model";

type EvalMatrixTableProps = {
  rows: EvalMatrixTestCaseRow[];
  variants: EvalPromptModelVariant[];
  isRunDisabled: boolean;
  onRunTestCase: (testCaseId: string) => void;
  onSelectCell: (selection: EvalCellSelection, mode: "matrix") => void;
  onCellButtonRef: (selection: EvalCellSelection, mode: "matrix", element: HTMLButtonElement | null) => void;
  onCellArrowNavigation: (selection: EvalCellSelection, direction: EvalMatrixCellNavigationDirection, mode: "matrix") => void;
};

export function EvalMatrixTable({
  rows,
  variants,
  isRunDisabled,
  onRunTestCase,
  onSelectCell,
  onCellButtonRef,
  onCellArrowNavigation,
}: EvalMatrixTableProps) {
  return (
    <div className="hidden overflow-x-auto border border-slate-800 bg-slate-950 md:block" data-layout="matrix">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="w-72 border-b border-r border-slate-800 px-3 py-3">Test Case</th>
            {variants.map((variant) => (
              <th key={variant.id} className="border-b border-slate-800 px-3 py-3">
                <span className="block text-slate-300">{variant.name}</span>
                <span className="mt-1 block normal-case tracking-normal text-blue-200">{variant.modelLabel}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.testCase.id} className="border-b border-slate-800 last:border-b-0">
              <th className="align-top border-r border-slate-800 bg-slate-950 px-3 py-3 font-normal">
                <p className="font-mono text-sm font-semibold text-slate-100">{row.testCase.name}</p>
                <p className="mt-1 text-xs text-slate-500">{row.inputSummary}</p>
                <button
                  type="button"
                  onClick={() => onRunTestCase(row.testCase.id)}
                  disabled={isRunDisabled}
                  className="mt-3 min-h-8 border border-slate-700 px-2 text-xs font-semibold text-blue-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                  aria-label={`Run only ${row.testCase.name}`}
                >
                  Run row
                </button>
              </th>
              {row.cells.map((cell) => (
                <td key={cell.id} className="min-w-80 px-3 py-3 align-top">
                  <button
                    type="button"
                    ref={(element) => onCellButtonRef(toCellSelection(cell), "matrix", element)}
                    onClick={() => onSelectCell(toCellSelection(cell), "matrix")}
                    onKeyDown={(event) => handleCellKeyDown(event, cell, onCellArrowNavigation)}
                    className={`flex w-full flex-col gap-1 border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${cellClassName(cell)}`}
                    aria-label={`Open ${cell.testCaseName} ${cell.variantName} detail: ${cell.statusLabel}. Press Enter or Space to open.`}
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-100">
                      {cell.statusLabel} · {cell.assertionSummary}
                    </span>
                    <span className="text-xs text-slate-400">{cell.metricSummary}</span>
                    <span className="line-clamp-2 font-mono text-xs text-slate-300">{cell.outputPreview}</span>
                    <span className="line-clamp-2 text-xs text-slate-500">{cell.diagnosticsSummary}</span>
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cellClassName(cell: EvalMatrixShellCell): string {
  if (cell.status === "failed" || cell.status === "error") {
    return "border-rose-500/60 bg-rose-950/30 hover:border-rose-300";
  }

  if (cell.status === "passed") {
    return "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-300";
  }

  if (cell.status === "running") {
    return "border-blue-400/50 bg-blue-950/20 hover:border-blue-200";
  }

  if (cell.status === "blocked") {
    return "border-amber-400/50 bg-amber-950/20 hover:border-amber-200";
  }

  return "border-slate-800 bg-slate-900/50 hover:border-slate-500";
}


function handleCellKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  cell: EvalMatrixShellCell,
  onCellArrowNavigation: EvalMatrixTableProps["onCellArrowNavigation"],
) {
  const direction = getArrowDirection(event.key);

  if (!direction) {
    return;
  }

  event.preventDefault();
  onCellArrowNavigation(toCellSelection(cell), direction, "matrix");
}

function getArrowDirection(key: string): EvalMatrixCellNavigationDirection | null {
  if (key === "ArrowUp") {
    return "up";
  }

  if (key === "ArrowDown") {
    return "down";
  }

  if (key === "ArrowLeft") {
    return "left";
  }

  if (key === "ArrowRight") {
    return "right";
  }

  return null;
}

function toCellSelection(cell: EvalMatrixShellCell): EvalCellSelection {
  return { testCaseId: cell.testCaseId, variantId: cell.variantId };
}
