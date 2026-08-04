import type { JournalDetailView } from "./adventure-detail-menu-types";
import { JournalRoadmapCard } from "./journal-roadmap-card";

type JournalRoadmapSectionProps = {
  title: string;
  details: JournalDetailView[];
  selectedDetailId: string | null;
  emptyMessage: string;
  onSelectDetail: (detailId: string) => void;
};

export function JournalRoadmapSection({
  title,
  details,
  selectedDetailId,
  emptyMessage,
  onSelectDetail,
}: JournalRoadmapSectionProps) {
  if (details.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">{title}</h3>
      <div className="space-y-3">
        {details.map((detail) => (
          <JournalRoadmapCard
            key={detail.id}
            detail={detail}
            isSelected={detail.id === selectedDetailId}
            emptyMessage={emptyMessage}
            onSelectDetail={onSelectDetail}
          />
        ))}
      </div>
    </section>
  );
}
