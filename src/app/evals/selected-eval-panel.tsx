import type { EvalConsoleSuite } from "./eval-console-types";

type SelectedEvalPanelProps = {
  selectedSuite: EvalConsoleSuite;
  status: "Ready";
  statusMessage: string;
};

export function SelectedEvalPanel({
  selectedSuite,
  status,
  statusMessage,
}: SelectedEvalPanelProps) {
  return (
    <section className="rounded-2xl border border-amber-300/25 bg-[#12070c]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100/90">
        Selected Eval
      </h2>
      <div className="mt-5">
        <p className="font-serif text-2xl font-bold text-amber-50">
          {selectedSuite.name}
        </p>
        <p className="mt-3 text-base font-semibold text-stone-100">
          Status: {status}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300">{statusMessage}</p>
      </div>
      <button
        type="button"
        disabled
        className="mt-6 min-h-12 w-full rounded-xl border border-amber-200/40 bg-amber-300/20 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-50 shadow-[0_0_28px_rgba(245,158,11,0.18)] disabled:cursor-not-allowed disabled:opacity-80"
      >
        Run Selected Eval
      </button>
    </section>
  );
}
