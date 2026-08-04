import type { JournalActView, JournalDetailView } from "./adventure-detail-menu-types";
import { JournalDetailPanel } from "./journal-detail-panel";
import { JournalEmptyState } from "./journal-empty-state";
import { JournalRoadmapSection } from "./journal-roadmap-section";

type JournalRoadmapPanelProps = {
  act: JournalActView | null;
  selectedDetail: JournalDetailView | null;
  selectedDetailId: string | null;
  emptyMessage: string;
  onSelectDetail: (detailId: string) => void;
};

export function JournalRoadmapPanel({
  act,
  selectedDetail,
  selectedDetailId,
  emptyMessage,
  onSelectDetail,
}: JournalRoadmapPanelProps) {
  if (!act) {
    return <JournalEmptyState message={emptyMessage} />;
  }

  const hasRoadmapEntries = act.mainQuests.length > 0 || act.sideQuests.length > 0 || act.bossFights.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(14rem,1fr)]">
      <section className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        {hasRoadmapEntries ? (
          <div className="space-y-6">
            <JournalRoadmapSection
              title="Main Quests"
              details={act.mainQuests}
              selectedDetailId={selectedDetailId}
              emptyMessage={emptyMessage}
              onSelectDetail={onSelectDetail}
            />
            <JournalRoadmapSection
              title="Side Quests"
              details={act.sideQuests}
              selectedDetailId={selectedDetailId}
              emptyMessage={emptyMessage}
              onSelectDetail={onSelectDetail}
            />
            <JournalRoadmapSection
              title="Boss Fights"
              details={act.bossFights}
              selectedDetailId={selectedDetailId}
              emptyMessage={emptyMessage}
              onSelectDetail={onSelectDetail}
            />
          </div>
        ) : (
          <div className="mt-4">
            <JournalEmptyState message={emptyMessage} />
          </div>
        )}
      </section>
      <div className="hidden lg:block">
        <JournalDetailPanel detail={selectedDetail} emptyMessage={emptyMessage} />
      </div>
    </div>
  );
}
