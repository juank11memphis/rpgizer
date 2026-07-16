import type { EvalMatrixRunScope, EvalMatrixTestCaseRow } from "./eval-matrix-types";

type EvalRunScopeControlsProps = {
  runScope: EvalMatrixRunScope;
  testCaseRows: EvalMatrixTestCaseRow[];
  disabled: boolean;
  runButtonLabel: string;
  onRunScopeChange: (scope: EvalMatrixRunScope) => void;
  onRunSelectedScope: () => void;
};

export function EvalRunScopeControls({
  runScope,
  testCaseRows,
  disabled,
  runButtonLabel,
  onRunScopeChange,
  onRunSelectedScope,
}: EvalRunScopeControlsProps) {
  const selectedTestCaseId = runScope.type === "test_case"
    ? runScope.testCaseId
    : testCaseRows[0]?.testCase.id ?? "";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-300">
        <span>Run scope</span>
        <select
          value={runScope.type}
          onChange={(event) => {
            if (event.target.value === "test_case") {
              onRunScopeChange({ type: "test_case", testCaseId: selectedTestCaseId });
              return;
            }

            onRunScopeChange({ type: "all" });
          }}
          disabled={disabled}
          className="min-h-10 border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="all">All test cases</option>
          <option value="test_case">Selected test case</option>
        </select>
      </label>

      {runScope.type === "test_case" ? (
        <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-slate-300 sm:min-w-64">
          <span>Test case</span>
          <select
            value={selectedTestCaseId}
            onChange={(event) => onRunScopeChange({ type: "test_case", testCaseId: event.target.value })}
            disabled={disabled || testCaseRows.length === 0}
            className="min-h-10 border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testCaseRows.map((row) => (
              <option key={row.testCase.id} value={row.testCase.id}>
                {row.testCase.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <button
        type="button"
        onClick={onRunSelectedScope}
        disabled={disabled}
        className="min-h-11 border border-blue-400 bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:border-slate-600 disabled:bg-slate-800 disabled:text-slate-400"
      >
        {runButtonLabel}
      </button>
    </div>
  );
}
