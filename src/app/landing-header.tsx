import Link from "next/link";

const startAdventureHref = "/login?next=/adventures/new";

export function LandingHeader() {
  return (
    <header className="relative z-10 border-b border-amber-400/20 bg-[#12070c]/90 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8 lg:px-10"
      >
        <Link
          href="/"
          className="rounded-sm font-serif text-xl font-bold tracking-[0.24em] text-amber-100 outline-none [text-shadow:0_0_18px_rgba(245,158,11,0.45)] transition hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c]"
        >
          RPGizer
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] sm:gap-4">
          <a
            href="#how-it-works"
            className="hidden min-h-11 items-center rounded-sm border border-transparent px-4 text-stone-300 outline-none transition hover:border-amber-400/30 hover:bg-amber-950/20 hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c] sm:inline-flex"
          >
            How it works
          </a>
          <Link
            href={startAdventureHref}
            className="inline-flex min-h-11 items-center rounded-sm border border-amber-300/60 bg-gradient-to-b from-amber-300 to-amber-600 px-5 text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_22px_rgba(217,119,6,0.22)] outline-none transition hover:from-amber-200 hover:to-amber-500 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12070c]"
          >
            Start
          </Link>
        </div>
      </nav>
    </header>
  );
}
