import type { JournalActView, JournalDetailView, JournalTabView } from "./adventure-detail-menu-types";
import { JournalActsList } from "./journal-acts-list";
import { JournalEmptyState } from "./journal-empty-state";
import { JournalRoadmapPanel } from "./journal-roadmap-panel";

type JournalTabProps = {
  journal: JournalTabView;
  selectedActId: string | null;
  selectedDetailId: string | null;
  onSelectAct: (actId: string) => void;
  onSelectDetail: (detailId: string) => void;
};

export function JournalTab({
  journal,
  selectedActId,
  selectedDetailId,
  onSelectAct,
  onSelectDetail,
}: JournalTabProps) {
  const selectedAct = findSelectedAct(journal.acts, selectedActId);
  const selectedDetail = findSelectedDetail(selectedAct, selectedDetailId);
  const hasRoadmapEntries = journal.acts.some(
    (act) => act.mainQuests.length > 0 || act.sideQuests.length > 0 || act.bossFights.length > 0,
  );

  if (journal.acts.length === 0 || !hasRoadmapEntries) {
    return (
      <section className="text-stone-100">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">{journal.label}</p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Adventure roadmap</h2>
        <div className="mt-4">
          <JournalEmptyState message={journal.emptyMessage} />
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 text-stone-100 lg:grid-cols-[minmax(10rem,0.7fr)_minmax(0,2.3fr)]">
      <h2 className="sr-only">Adventure roadmap</h2>
      <JournalActsList acts={journal.acts} selectedActId={selectedAct?.id ?? null} onSelectAct={onSelectAct} />
      <JournalRoadmapPanel
        act={selectedAct}
        selectedDetail={selectedDetail}
        selectedDetailId={selectedDetail?.id ?? null}
        emptyMessage={journal.emptyMessage}
        onSelectDetail={onSelectDetail}
      />
    </section>
  );
}

function findSelectedAct(acts: JournalActView[], selectedActId: string | null) {
  return acts.find((act) => act.id === selectedActId) ?? acts[0] ?? null;
}

function findSelectedDetail(act: JournalActView | null, selectedDetailId: string | null): JournalDetailView | null {
  if (!act) {
    return null;
  }

  const details = getActDetails(act);
  return details.find((detail) => detail.id === selectedDetailId) ?? details[0] ?? null;
}

function getActDetails(act: JournalActView) {
  return [...act.mainQuests, ...act.sideQuests, ...act.bossFights];
}
