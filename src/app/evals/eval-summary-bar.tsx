import type { EvalMatrixViewModel } from "./eval-matrix-types";

type EvalSummaryBarProps = {
  viewModel: EvalMatrixViewModel;
};

export function EvalSummaryBar({ viewModel }: EvalSummaryBarProps) {
  const progressPercent = viewModel.progress.total === 0
    ? 0
    : Math.round((viewModel.progress.completed / viewModel.progress.total) * 100);

  return (
    <section aria-label="Eval run summary" className="mt-3 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2 lg:grid-cols-4">
      {viewModel.summaryStats.map((stat) => (
        <div key={stat.label} className="border border-slate-800 bg-slate-900/80 px-3 py-2">
          <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {stat.label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-100">{stat.value}</dd>
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-4" aria-label={viewModel.progress.label}>
        <div className="h-1.5 border border-slate-800 bg-slate-900">
          <div className="h-full bg-blue-400" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
    </section>
  );
}
