const ritualStatusLines = [
  "Reading the quest notes...",
  "Tempering your goal...",
  "Binding constraints and resources...",
  "Sealing the foundation...",
];

export function ForgeLoading() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07030d] px-5 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center text-center">
        <div
          className="relative mx-auto mb-10 flex size-40 items-center justify-center rounded-full border border-amber-200/20 bg-amber-500/10 shadow-[0_0_80px_rgba(245,158,11,0.2)] motion-safe:animate-pulse"
          aria-hidden="true"
        >
          <div className="absolute inset-4 rounded-full border border-dashed border-amber-200/30 motion-safe:animate-spin [animation-duration:18s]" />
          <div className="absolute inset-10 rounded-full border border-amber-100/20" />
          <span className="text-5xl drop-shadow-[0_0_24px_rgba(251,191,36,0.55)]">🔥</span>
          <span className="absolute top-4 text-amber-100/70">◇</span>
          <span className="absolute bottom-4 text-amber-100/70">◇</span>
          <span className="absolute left-5 text-amber-100/70">◇</span>
          <span className="absolute right-5 text-amber-100/70">◇</span>
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.22em] text-amber-200">
          The forge is lit
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl">
          Forging your Adventure foundation...
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-stone-300">
          The Game Master is distilling your answers into a clear starting point.
        </p>
        <ul className="mt-8 space-y-2 text-sm font-semibold text-amber-100/85" aria-label="Forge ritual steps">
          {ritualStatusLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
