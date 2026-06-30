export function AdventureLogPreview() {
  return (
    <section aria-label="Fictional Adventure Log preview" className="mx-auto w-full max-w-3xl">
      <div className="relative border border-amber-300/35 bg-[#160c0a]/92 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.62),inset_0_0_0_1px_rgba(251,191,36,0.12)] sm:p-6">
        <div className="pointer-events-none absolute inset-2 border border-amber-200/15" />
        <div className="pointer-events-none absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-amber-300/70" />
        <div className="pointer-events-none absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-amber-300/70" />
        <div className="pointer-events-none absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-amber-300/70" />
        <div className="pointer-events-none absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-amber-300/70" />

        <div className="relative bg-[radial-gradient(circle_at_top,rgba(146,64,14,0.26),rgba(28,12,8,0.92)_42%,rgba(7,3,13,0.94)_100%)] p-4 sm:p-6">
          <div className="mb-6 flex flex-col gap-2 border-b border-amber-300/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-serif text-sm font-semibold uppercase tracking-[0.28em] text-amber-200">
                Adventure Log
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-stone-50">
                Goal: Run my first 5K
              </h2>
            </div>
            <p className="text-sm uppercase tracking-[0.14em] text-stone-400">Example preview</p>
          </div>

          <div className="space-y-4">
            <div className="border border-emerald-300/25 bg-emerald-950/20 p-4 shadow-[inset_4px_0_0_rgba(52,211,153,0.42)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-100">
                Act I: Build the Base
              </p>
              <p className="mt-3 text-lg font-semibold text-stone-50">
                ✓ Main Quest: Walk-run 3 times this week
              </p>
            </div>

            <div className="border border-red-300/30 bg-red-950/25 p-4 shadow-[inset_4px_0_0_rgba(248,113,113,0.48)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-100">
                ⚔ Boss Fight
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-50">Finish a full 5K route</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-cyan-200/25 bg-cyan-950/18 p-4">
                <h3 className="font-serif text-lg font-semibold text-cyan-100">Skills</h3>
                <dl className="mt-3 space-y-3 text-sm text-stone-200">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2">
                    <dt>Stamina</dt>
                    <dd className="font-semibold text-stone-50">Lv 2</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt>Consistency</dt>
                    <dd className="font-semibold text-stone-50">Lv 1</dd>
                  </div>
                </dl>
              </div>
              <div className="border border-amber-200/30 bg-amber-950/20 p-4">
                <h3 className="font-serif text-lg font-semibold text-amber-100">Inventory</h3>
                <p className="mt-3 text-sm text-stone-200">□ Running shoes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
