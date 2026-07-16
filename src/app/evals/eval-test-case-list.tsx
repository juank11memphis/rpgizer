import type { EvalCellSelection, EvalMatrixShellCell, EvalMatrixTestCaseRow } from "./eval-matrix-types";

type EvalTestCaseListProps = {
  rows: EvalMatrixTestCaseRow[];
  onSelectCell: (selection: EvalCellSelection) => void;
};

export function EvalTestCaseList({ rows, onSelectCell }: EvalTestCaseListProps) {
  return (
    <section aria-label="Phone Test Cases" className="flex flex-col gap-2 md:hidden" data-layout="stacked-list">
      <h2 className="px-1 text-sm font-semibold text-slate-200">Test Cases</h2>
      {rows.map((row) => (
        <article key={row.testCase.id} className="border border-slate-800 bg-slate-900/75 p-3">
          <p className="font-mono text-sm font-semibold text-slate-100">{row.testCase.name}</p>
          <p className="mt-1 text-xs text-slate-500">{row.inputSummary}</p>
          {row.cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              onClick={() => onSelectCell({ testCaseId: cell.testCaseId, variantId: cell.variantId })}
              className={`mt-3 flex w-full flex-col gap-1 border-t pt-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-200 ${cellListClassName(cell)}`}
              aria-label={`Open ${cell.testCaseName} ${cell.variantName} detail: ${cell.statusLabel}`}
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
