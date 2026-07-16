import type { EvalMatrixViewModel } from "./eval-matrix-types";

type EvalBlockedPanelProps = {
  viewModel: EvalMatrixViewModel;
};

export function EvalBlockedPanel({ viewModel }: EvalBlockedPanelProps) {
  return (
    <section aria-label="Configuration blocker" className="border border-amber-500/50 bg-amber-950/20 p-4 text-slate-100">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">{viewModel.statusLabel}</p>
      <h2 className="mt-2 text-lg font-semibold">{viewModel.blockerMessage}</h2>
      <p className="mt-2 text-sm text-slate-300">Add local config, then run the eval again.</p>
      <div className="mt-4 border border-slate-800 bg-slate-950 p-3 text-sm text-slate-400">
        {viewModel.matrixUnavailableMessage}
      </div>
    </section>
  );
}
