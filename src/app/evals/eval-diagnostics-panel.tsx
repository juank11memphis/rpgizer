type EvalDiagnosticsPanelProps = {
  message: string;
};

export function EvalDiagnosticsPanel({ message }: EvalDiagnosticsPanelProps) {
  return (
    <section className="rounded-2xl border border-amber-300/25 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-amber-100/90">
        Diagnostics
      </h2>
      <p className="mt-5 text-sm leading-6 text-stone-300">{message}</p>
    </section>
  );
}
