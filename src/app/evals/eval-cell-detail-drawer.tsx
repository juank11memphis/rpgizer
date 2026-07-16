import type { EvalMatrixShellCell } from "./eval-matrix-types";

type EvalCellDetailDrawerProps = {
  cell: EvalMatrixShellCell;
  onClose: () => void;
};

export function EvalCellDetailDrawer({ cell, onClose }: EvalCellDetailDrawerProps) {
  const detail = cell.detail;

  if (!detail) {
    return null;
  }

  return (
    <aside
      aria-label="Cell detail"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[88vh] overflow-y-auto border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-slate-950/70 md:inset-x-auto md:right-4 md:top-4 md:h-[calc(100vh-2rem)] md:max-h-none md:w-[70vw] md:max-w-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cell detail</p>
          <h2 className="mt-1 font-mono text-lg font-semibold text-slate-50">{cell.testCaseName}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {cell.statusLabel} · {cell.variantName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Close cell detail"
        >
          ✕
        </button>
      </div>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-100">Output</h3>
        <pre className="mt-2 whitespace-pre-wrap border border-slate-800 bg-slate-900/70 p-3 font-mono text-xs text-slate-200">
          {detail.outputMarkdown}
        </pre>
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-100">Assertions</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {detail.assertions.map((assertion) => (
            <li key={assertion.id} className="border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
              <span className={assertion.status === "passed" ? "text-emerald-300" : "text-rose-300"}>
                {assertion.status === "passed" ? "✓" : "✕"}
              </span>{" "}
              <span className="font-semibold">{assertion.label}</span>
              {assertion.message ? <p className="mt-1 text-xs text-slate-400">{assertion.message}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      {detail.expectedGolden ? (
        <section className="mt-4">
          <h3 className="text-sm font-semibold text-slate-100">Expected / Golden</h3>
          <pre className="mt-2 whitespace-pre-wrap border border-slate-800 bg-slate-900/70 p-3 font-mono text-xs text-slate-200">
            {detail.expectedGolden}
          </pre>
        </section>
      ) : null}

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-100">Diagnostics</h3>
        {detail.diagnostics.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No diagnostics.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-sm text-slate-300">
            {detail.diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code ?? diagnostic.scope}-${index}`} className="border border-slate-800 bg-slate-900/70 p-3">
                {diagnostic.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold text-slate-100">Raw artifacts</h3>
        <div className="mt-2 flex flex-col gap-2">
          {detail.artifacts.map((artifact) => (
            <details key={artifact.id} className="border border-slate-800 bg-slate-900/70 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                {artifact.label} · Local only
              </summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-300">
                {artifact.value ?? artifact.preview ?? "Artifact not available."}
              </pre>
            </details>
          ))}
        </div>
      </section>
    </aside>
  );
}
