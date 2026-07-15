import { AvailableEvalsPanel } from "./available-evals-panel";
import { EvalDiagnosticsPanel } from "./eval-diagnostics-panel";
import type { ReadyEvalConsoleViewModel } from "./eval-console-types";
import { SelectedEvalPanel } from "./selected-eval-panel";

type EvalConsoleScreenProps = {
  viewModel: ReadyEvalConsoleViewModel;
};

export function EvalConsoleScreen({ viewModel }: EvalConsoleScreenProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07030d] px-4 py-8 text-stone-100 sm:px-8 lg:px-10">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-10%,rgba(127,29,29,0.58)_0%,rgba(49,18,12,0.52)_28%,rgba(7,3,13,0.98)_72%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_20%,rgba(180,83,9,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(90deg,rgba(250,204,21,0.06)_1px,transparent_1px),linear-gradient(rgba(250,204,21,0.04)_1px,transparent_1px)] bg-[length:auto,auto,72px_72px,72px_72px]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-amber-500/10 to-transparent" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-amber-300/20 bg-black/30 p-6 shadow-[0_26px_100px_rgba(0,0,0,0.55)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-200/80">
            Local Product Quality Evaluation
          </p>
          <h1 className="mt-3 font-serif text-4xl font-black uppercase tracking-[0.12em] text-amber-50 [text-shadow:0_0_28px_rgba(245,158,11,0.45)] sm:text-5xl">
            Arcane Eval Console
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
            Local evals before changes ship.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AvailableEvalsPanel
            suites={viewModel.suites}
            availableCountLabel={viewModel.availableCountLabel}
          />
          <SelectedEvalPanel
            selectedSuite={viewModel.selectedSuite}
            status={viewModel.status}
            statusMessage={viewModel.statusMessage}
          />
        </div>

        <EvalDiagnosticsPanel message={viewModel.diagnosticsMessage} />
      </div>
    </main>
  );
}
