import type { EvalConsoleSuite } from "./eval-console-types";

type AvailableEvalsPanelProps = {
  suites: EvalConsoleSuite[];
  availableCountLabel: string;
};

export function AvailableEvalsPanel({
  suites,
  availableCountLabel,
}: AvailableEvalsPanelProps) {
  return (
    <section className="rounded-2xl border border-amber-300/25 bg-[#12070c]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100/90">
        Available Evals
      </h2>
      <div className="mt-5 space-y-3" role="listbox" aria-label="Available evals">
        {suites.map((suite) => (
          <div
            key={suite.id}
            role="option"
            aria-selected={suite.selected}
            className="rounded-xl border border-amber-300/30 bg-amber-100/[0.06] p-4 text-stone-100 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.08)]"
          >
            <div className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1 h-3 w-3 shrink-0 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]"
              />
              <div>
                <p className="font-serif text-lg font-bold text-amber-50">
                  {suite.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-300">
                  {suite.shortDescription}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-amber-100/75">{availableCountLabel}</p>
    </section>
  );
}
