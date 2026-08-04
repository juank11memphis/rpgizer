import type { JournalDetailView } from "./adventure-detail-menu-types";
import { JournalDetailPanel } from "./journal-detail-panel";

type JournalRoadmapCardProps = {
  detail: JournalDetailView;
  isSelected: boolean;
  emptyMessage: string;
  onSelectDetail: (detailId: string) => void;
};

export function JournalRoadmapCard({ detail, isSelected, emptyMessage, onSelectDetail }: JournalRoadmapCardProps) {
  const isBossFight = detail.type === "boss_fight";

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={() => onSelectDetail(detail.id)}
        className={`min-h-11 w-full rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
          isSelected
            ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
            : isBossFight
              ? "border-rose-200/35 bg-rose-950/15 hover:border-rose-100/60 hover:bg-rose-950/25"
              : "border-amber-200/15 bg-black/25 hover:border-amber-200/40 hover:bg-amber-200/5"
        }`}
      >
        <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
          {detail.typeLabel}
        </span>
        <span className="mt-2 block font-serif text-lg leading-tight text-amber-100">{detail.title}</span>
        {isBossFight ? (
          <span className="mt-3 block rounded-md border border-rose-200/25 bg-black/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">
            Milestone challenge
          </span>
        ) : null}
        <span className="mt-3 line-clamp-2 block text-sm leading-5 text-stone-300">{detail.rewardIntent}</span>
      </button>
      {isSelected ? (
        <div className="lg:hidden">
          <JournalDetailPanel detail={detail} emptyMessage={emptyMessage} />
        </div>
      ) : null}
    </div>
  );
}
