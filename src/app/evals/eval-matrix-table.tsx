import type { EvalMatrixTestCaseRow } from "./eval-matrix-types";
import type { EvalPromptModelVariant } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

type EvalMatrixTableProps = {
  rows: EvalMatrixTestCaseRow[];
  variants: EvalPromptModelVariant[];
};

export function EvalMatrixTable({ rows, variants }: EvalMatrixTableProps) {
  return (
    <div className="hidden overflow-x-auto border border-slate-800 bg-slate-950 md:block" data-layout="matrix">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-400">
          <tr>
            <th className="w-72 border-b border-r border-slate-800 px-3 py-3">Test Case</th>
            {variants.map((variant) => (
              <th key={variant.id} className="border-b border-slate-800 px-3 py-3">
                {variant.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.testCase.id} className="border-b border-slate-800 last:border-b-0">
              <th className="align-top border-r border-slate-800 bg-slate-950 px-3 py-3 font-normal">
                <p className="font-mono text-sm font-semibold text-slate-100">{row.testCase.name}</p>
                <p className="mt-1 text-xs text-slate-500">{formatInputVariables(row.testCase.inputVariables)}</p>
              </th>
              {row.cells.map((cell) => (
                <td key={cell.id} className="min-w-80 px-3 py-3 align-top">
                  <div className="flex flex-col gap-1 border border-slate-800 bg-slate-900/50 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-200">
                      {cell.statusLabel}
                    </p>
                    <p className="text-sm text-slate-300">{cell.assertionSummary}</p>
                    <p className="text-xs text-slate-500">{cell.metricSummary}</p>
                    <p className="mt-1 line-clamp-2 font-mono text-xs text-slate-400">{cell.outputPreview}</p>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInputVariables(inputVariables: Record<string, string>): string {
  const entries = Object.entries(inputVariables);
  return entries.length === 0
    ? "No input variables"
    : entries.map(([key, value]) => `${key}=${value}`).join(" · ");
}
