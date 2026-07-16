import { EvalBlockedPanel } from "./eval-blocked-panel";
import { EvalFilterBar } from "./eval-filter-bar";
import { EvalMatrixTable } from "./eval-matrix-table";
import type { EvalMatrixViewModel } from "./eval-matrix-types";
import { EvalSummaryBar } from "./eval-summary-bar";
import { EvalTestCaseList } from "./eval-test-case-list";

type EvalMatrixScreenProps = {
  viewModel: EvalMatrixViewModel;
  onRunSelectedEval: () => void;
};

export function EvalMatrixScreen({ viewModel, onRunSelectedEval }: EvalMatrixScreenProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-3 py-4 text-slate-100 sm:px-5 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <header className="sticky top-0 z-20 border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {viewModel.eyebrow}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                  {viewModel.title}
                </h1>
                <p className="text-sm font-medium text-blue-200">{viewModel.selectedSuite.name}</p>
              </div>
              <p className="mt-1 text-sm text-slate-400">{viewModel.statusMessage}</p>
            </div>
            <button
              type="button"
              onClick={onRunSelectedEval}
              disabled={viewModel.action.disabled}
              className="min-h-11 border border-blue-400 bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-400"
            >
              {viewModel.action.label}
            </button>
          </div>
          <EvalSummaryBar viewModel={viewModel} />
          <EvalFilterBar filters={viewModel.filters} variants={viewModel.variants} />
        </header>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          Status: {viewModel.statusLabel}. {viewModel.progress.label}.
        </div>

        {viewModel.status === "blocked" ? (
          <EvalBlockedPanel viewModel={viewModel} />
        ) : (
          <section aria-label="Eval results" className="flex flex-col gap-3">
            <EvalTestCaseList rows={viewModel.rows} />
            <EvalMatrixTable rows={viewModel.rows} variants={viewModel.variants} />
          </section>
        )}
      </div>
    </main>
  );
}
