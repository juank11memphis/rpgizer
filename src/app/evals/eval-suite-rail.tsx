import type { EvalMatrixSuite } from "./eval-matrix-types";

type EvalSuiteRailProps = {
  suites: EvalMatrixSuite[];
  availableCountLabel: string;
  disabled: boolean;
  onSuiteChange: (suiteId: string) => void;
};

export function EvalSuiteRail({
  suites,
  availableCountLabel,
  disabled,
  onSuiteChange,
}: EvalSuiteRailProps) {
  return (
    <aside aria-label="Eval Suites" className="hidden w-56 shrink-0 border border-slate-800 bg-slate-950 p-3 lg:block">
      <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Eval Suites</h2>
      <div className="mt-4 flex flex-col gap-1" role="listbox" aria-label="Eval Suites">
        {suites.map((suite) => (
          <button
            key={suite.id}
            type="button"
            onClick={() => onSuiteChange(suite.id)}
            disabled={disabled}
            aria-pressed={suite.selected}
            className={`flex min-h-10 items-center gap-2 border px-2 py-2 text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${suiteClassName(suite.selected)}`}
          >
            <span aria-hidden="true">{suite.selected ? "●" : "○"}</span>
            <span className="min-w-0 truncate">{suite.name}</span>
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs text-slate-500">{availableCountLabel}</p>
    </aside>
  );
}

function suiteClassName(selected: boolean): string {
  return selected
    ? "border-blue-400 bg-blue-950/40 text-blue-100"
    : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900";
}
