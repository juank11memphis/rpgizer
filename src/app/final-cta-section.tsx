import Link from "next/link";

const startAdventureHref = "/login?next=/adventures/new";

export function FinalCtaSection() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="final-cta-heading">
      <div className="relative mx-auto max-w-3xl border border-amber-300/35 bg-[#150908]/90 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.58),inset_0_0_60px_rgba(146,64,14,0.16)] sm:p-12">
        <div className="pointer-events-none absolute inset-2 border border-amber-200/15" />
        <h2 id="final-cta-heading" className="font-serif text-4xl font-black text-stone-50 sm:text-5xl">
          Make the path playable.
        </h2>
        <p className="mx-auto mt-5 max-w-xl leading-7 text-stone-300">
          Bring one real-life goal. RPGizer turns the next step into an Adventure you can follow.
        </p>
        <Link
          href={startAdventureHref}
          className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-7 font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.35)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#150908] active:translate-y-0"
        >
          Start a New Adventure
        </Link>
      </div>
    </section>
  );
}
