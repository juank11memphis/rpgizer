import type { EvalMatrixTestCaseRow } from "./eval-matrix-types";

type EvalTestCaseListProps = {
  rows: EvalMatrixTestCaseRow[];
};

export function EvalTestCaseList({ rows }: EvalTestCaseListProps) {
  return (
    <section aria-label="Phone Test Cases" className="flex flex-col gap-2 md:hidden" data-layout="stacked-list">
      <h2 className="px-1 text-sm font-semibold text-slate-200">Test Cases</h2>
      {rows.map((row) => (
        <article key={row.testCase.id} className="border border-slate-800 bg-slate-900/75 p-3">
          <p className="font-mono text-sm font-semibold text-slate-100">{row.testCase.name}</p>
          <p className="mt-1 text-xs text-slate-500">{formatInputVariables(row.testCase.inputVariables)}</p>
          {row.cells.map((cell) => (
            <div key={cell.id} className="mt-3 border-t border-slate-800 pt-3">
              <p className="text-sm font-semibold text-slate-200">{cell.statusLabel}</p>
              <p className="text-xs text-slate-500">{cell.assertionSummary}</p>
              <p className="mt-1 text-xs text-slate-500">{cell.metricSummary}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">{cell.outputPreview}</p>
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}

function formatInputVariables(inputVariables: Record<string, string>): string {
  const entries = Object.entries(inputVariables);
  return entries.length === 0
    ? "No input variables"
    : entries.map(([key, value]) => `${key}=${value}`).join(" · ");
}
