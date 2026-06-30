import Link from "next/link";

const startAdventureHref = "/login?next=/adventures/new";

export function HeroSection() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center py-12 text-center sm:py-16 lg:py-20">
      <p className="mb-6 inline-flex rounded-sm border border-amber-300/30 bg-black/35 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-100 shadow-[0_0_30px_rgba(180,83,9,0.18)]">
        Real goals. Playable progress.
      </p>
      <h1 className="max-w-5xl font-serif text-5xl font-black leading-[0.95] tracking-tight text-stone-50 [text-shadow:0_6px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(217,119,6,0.22)] sm:text-7xl lg:text-8xl">
        Turn your real-life goal into a playable adventure.
      </h1>
      <div className="mt-7 h-px w-40 bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-200 sm:text-xl sm:leading-9">
        Answer focused questions. Get quests, boss fights, skills, inventory,
        achievements, and your next move.
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
        <Link
          href={startAdventureHref}
          className="inline-flex min-h-12 items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-7 font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.35)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0"
        >
          Start a New Adventure
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex min-h-12 items-center justify-center rounded-sm border border-amber-200/35 bg-black/35 px-7 font-bold uppercase tracking-[0.12em] text-amber-100 shadow-[inset_0_0_0_1px_rgba(120,53,15,0.35)] outline-none transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-950/25 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0"
        >
          See How It Works
        </a>
      </div>
    </section>
  );
}
