type AdventureNotReadyProps = {
  adventureId: string;
};

export function AdventureNotReady({ adventureId }: AdventureNotReadyProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col justify-center rounded-2xl border border-amber-300/25 bg-[#120719]/90 p-6 text-stone-100 shadow-2xl shadow-amber-950/20 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/80">RPGizer</p>
      <h1 className="mt-4 font-serif text-3xl font-bold text-amber-100 sm:text-5xl">
        Adventure not ready
      </h1>
      <p className="mt-4 text-base leading-7 text-stone-200">
        This Adventure does not have a roadmap to review yet. Return to your Dashboard or continue
        the Adventure flow when you are ready.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300/50 bg-amber-200 px-5 py-3 text-sm font-semibold text-stone-950"
        >
          Back to Dashboard
        </a>
        <a
          href={`/adventures/${adventureId}/interview`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-300/35 px-5 py-3 text-sm font-semibold text-amber-100"
        >
          Continue Adventure flow
        </a>
      </div>
    </section>
  );
}
