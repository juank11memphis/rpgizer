import type { EvalMatrixSuite } from "./eval-matrix-types";

type EvalSuiteDropdownProps = {
  suites: EvalMatrixSuite[];
  selectedSuite: EvalMatrixSuite;
  disabled: boolean;
  onSuiteChange: (suiteId: string) => void;
};

export function EvalSuiteDropdown({
  suites,
  selectedSuite,
  disabled,
  onSuiteChange,
}: EvalSuiteDropdownProps) {
  return (
    <section aria-label="Eval Suite" className="border border-slate-800 bg-slate-900/70 p-3 lg:hidden">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-300">
        <span>Eval Suite</span>
        <select
          value={selectedSuite.id}
          onChange={(event) => onSuiteChange(event.target.value)}
          disabled={disabled}
          className="min-h-10 border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {suites.map((suite) => (
            <option key={suite.id} value={suite.id}>
              {suite.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-sm text-slate-300">{selectedSuite.shortDescription}</p>
    </section>
  );
}
