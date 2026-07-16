import type { EvalConsoleStatus, EvalConsoleSuite } from "./eval-console-types";

type SelectedEvalPanelProps = {
  selectedSuite: EvalConsoleSuite;
  status: EvalConsoleStatus;
  statusLabel: string;
  statusMessage: string;
  actionLabel: string;
  actionDisabled: boolean;
  onRunSelectedEval: () => void;
};

export function SelectedEvalPanel({
  selectedSuite,
  status,
  statusLabel,
  statusMessage,
  actionLabel,
  actionDisabled,
  onRunSelectedEval,
}: SelectedEvalPanelProps) {
  return (
    <section className={`rounded-2xl border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-6 ${statusPanelClasses(status)}`}>
      <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100/90">
        Selected Eval
      </h2>
      <div className="mt-5">
        <p className="font-serif text-2xl font-bold text-amber-50">
          {selectedSuite.name}
        </p>
        <p className={`mt-3 text-base font-semibold ${statusTextClasses(status)}`}>
          Status: {statusLabel}
        </p>
        <p className="mt-3 text-sm leading-6 text-stone-300">{statusMessage}</p>
        {status === "running" ? (
          <p className="mt-5 text-2xl tracking-[0.35em] text-sky-200 motion-safe:animate-pulse" aria-hidden="true">
            ◌ ◌ ◌
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={actionDisabled}
        onClick={onRunSelectedEval}
        className="mt-6 min-h-12 w-full rounded-xl border border-amber-200/40 bg-amber-300 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_0_28px_rgba(245,158,11,0.3)] transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:ring-offset-2 focus:ring-offset-[#12070c] disabled:cursor-not-allowed disabled:bg-amber-300/25 disabled:text-amber-50 disabled:opacity-80"
      >
        {actionLabel}
      </button>
    </section>
  );
}

function statusPanelClasses(status: EvalConsoleStatus): string {
  switch (status) {
    case "passed":
      return "border-emerald-300/35 bg-emerald-950/35";
    case "failed":
      return "border-red-300/35 bg-red-950/35";
    case "blocked":
      return "border-amber-300/45 bg-amber-950/35";
    case "error":
      return "border-zinc-300/35 bg-zinc-950/45";
    case "running":
      return "border-sky-300/35 bg-sky-950/25";
    case "ready":
      return "border-amber-300/25 bg-[#12070c]/90";
  }
}

function statusTextClasses(status: EvalConsoleStatus): string {
  switch (status) {
    case "passed":
      return "text-emerald-200";
    case "failed":
      return "text-red-200";
    case "blocked":
      return "text-amber-200";
    case "error":
      return "text-zinc-200";
    case "running":
      return "text-sky-200";
    case "ready":
      return "text-stone-100";
  }
}
