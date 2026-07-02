import Link from "next/link";

type ReadyToForgePanelProps = {
  adventureId: string;
};

export function ReadyToForgePanel({ adventureId }: ReadyToForgePanelProps) {
  return (
    <section
      aria-labelledby="ready-to-forge-heading"
      className="rounded-sm border border-amber-300/35 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.20),rgba(0,0,0,0)_48%),rgba(12,6,16,0.92)] p-5 shadow-[0_0_44px_rgba(245,158,11,0.16)] sm:p-6"
    >
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200/80">
        Ready to forge
      </p>
      <h2
        id="ready-to-forge-heading"
        className="mt-3 font-serif text-2xl font-bold leading-tight text-amber-100"
      >
        The Game Master has what they need.
      </h2>
      <p className="mt-3 text-sm leading-6 text-stone-300 sm:text-base">
        Your answers are locked in for the next step. Time to shape them into the
        foundation of your Adventure.
      </p>
      <Link
        href={`/adventures/${adventureId}/forge`}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-sm border border-amber-200 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 px-6 text-center font-bold uppercase tracking-[0.12em] text-stone-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_34px_rgba(245,158,11,0.22)] outline-none transition hover:-translate-y-0.5 hover:from-amber-100 hover:to-amber-600 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d] active:translate-y-0"
      >
        Forge My Adventure
      </Link>
    </section>
  );
}
