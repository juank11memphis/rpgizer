import type { AdventureDetailMenuView } from "@/modules/adventure-experience-presenter/application/get-adventure-detail-menu/output";

type AdventureDetailMenuScreenProps = {
  menu: AdventureDetailMenuView;
};

export function AdventureDetailMenuScreen({ menu }: AdventureDetailMenuScreenProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-8 rounded-2xl border border-amber-300/25 bg-[#120719]/90 p-6 shadow-2xl shadow-amber-950/20 sm:p-8">
      <header className="space-y-3 border-b border-amber-200/15 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/80">RPGizer</p>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-amber-100 sm:text-5xl">
            {menu.header.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-stone-200">{menu.header.goalSummary}</p>
          {menu.header.themeSummary ? (
            <p className="text-sm text-emerald-200/85">Theme: {menu.header.themeSummary}</p>
          ) : null}
        </div>
      </header>

      <nav aria-label="Adventure menu sections" className="flex flex-wrap gap-3">
        {menu.tabs.map((tab) => (
          <span
            key={tab.id}
            className="rounded-lg border border-amber-300/30 px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-amber-100"
          >
            {tab.label}
          </span>
        ))}
      </nav>

      <div className="rounded-xl border border-stone-500/20 bg-black/20 p-5 text-stone-200">
        <h2 className="font-serif text-2xl text-amber-100">Adventure menu is ready</h2>
        <p className="mt-2 max-w-2xl leading-7">
          Your read-only command menu is available. Detailed Journal, Inventory, Character, and
          Achievements panels arrive in the next slices.
        </p>
      </div>
    </section>
  );
}
