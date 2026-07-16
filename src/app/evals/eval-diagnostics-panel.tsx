import type { EvalDiagnostic } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";

import type { EvalConsoleStatus } from "./eval-console-types";

type EvalDiagnosticsPanelProps = {
  title: "Diagnostics" | "Configuration";
  status: EvalConsoleStatus;
  message?: string;
  diagnostics: EvalDiagnostic[];
};

export function EvalDiagnosticsPanel({
  title,
  status,
  message,
  diagnostics,
}: EvalDiagnosticsPanelProps) {
  return (
    <section className={`rounded-2xl border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 ${diagnosticsPanelClasses(status)}`} aria-labelledby="eval-diagnostics-title">
      <h2 id="eval-diagnostics-title" className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100/90">
        {title}
      </h2>
      {message ? <p className="mt-5 text-sm leading-6 text-stone-300">{message}</p> : null}
      {diagnostics.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.fixtureId ?? diagnostic.code ?? diagnostic.scope}-${index}`} className="rounded-xl border border-white/10 bg-black/25 p-4">
              {diagnostic.fixtureId ? (
                <p className="font-mono text-xs text-amber-100">[{diagnostic.fixtureId}]</p>
              ) : null}
              <p className="mt-1 text-sm leading-6 text-stone-200">{diagnostic.message}</p>
              {status === "blocked" ? (
                <p className="mt-3 text-sm leading-6 text-amber-100/85">
                  Add local config, then check again.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function diagnosticsPanelClasses(status: EvalConsoleStatus): string {
  switch (status) {
    case "failed":
      return "border-red-300/30 bg-red-950/20";
    case "blocked":
      return "border-amber-300/40 bg-amber-950/25";
    case "error":
      return "border-zinc-300/30 bg-black/35";
    default:
      return "border-amber-300/25 bg-black/35";
  }
}
