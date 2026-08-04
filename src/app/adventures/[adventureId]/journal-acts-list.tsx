import type { JournalActView } from "./adventure-detail-menu-types";

type JournalActsListProps = {
  acts: JournalActView[];
  selectedActId: string | null;
  onSelectAct: (actId: string) => void;
};

export function JournalActsList({ acts, selectedActId, onSelectAct }: JournalActsListProps) {
  return (
    <nav aria-label="Acts" className="rounded-xl border border-amber-200/15 bg-black/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">Acts</p>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {acts.map((act) => (
          <button
            key={act.id}
            type="button"
            aria-pressed={act.id === selectedActId}
            onClick={() => onSelectAct(act.id)}
            className={`min-h-11 min-w-48 rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 lg:min-w-0 ${
              act.id === selectedActId
                ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
                : "border-amber-200/15 bg-black/25 hover:border-amber-200/40 hover:bg-amber-200/5"
            }`}
          >
            <span className="block font-serif text-lg leading-tight text-amber-100">{act.title}</span>
            <span className="mt-2 line-clamp-2 block text-sm leading-5 text-stone-300">{act.summary}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
