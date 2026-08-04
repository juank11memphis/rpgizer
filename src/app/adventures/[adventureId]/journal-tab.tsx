import type { JournalTabView } from "./adventure-detail-menu-types";

type JournalTabProps = {
  journal: JournalTabView;
};

export function JournalTab({ journal }: JournalTabProps) {
  const firstAct = journal.acts[0];
  const questCount = journal.acts.reduce(
    (count, act) => count + act.mainQuests.length + act.sideQuests.length + act.bossFights.length,
    0,
  );

  return (
    <section className="grid gap-4 text-stone-100 lg:grid-cols-[minmax(10rem,0.75fr)_minmax(0,2fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">Acts</p>
        {firstAct ? (
          <div className="mt-4 space-y-2">
            <p className="font-serif text-xl text-amber-100">{firstAct.title}</p>
            <p className="text-sm leading-6 text-stone-300">{firstAct.summary}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-300">{journal.emptyMessage}</p>
        )}
      </div>
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {journal.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Adventure roadmap</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Review Acts, Main Quests, Side Quests, and Boss Fights for this Adventure.
        </p>
        {firstAct ? (
          <p className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">
            {firstAct.title} contains {questCount} roadmap entries.
          </p>
        ) : null}
      </div>
    </section>
  );
}
