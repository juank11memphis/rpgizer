import type { AchievementsTabView, AchievementView } from "./adventure-detail-menu-types";
import { AchievementBadgeGrid } from "./achievement-badge-grid";
import { AchievementMilestoneDetail } from "./achievement-milestone-detail";

type AchievementsTabProps = {
  achievements: AchievementsTabView;
  selectedAchievementId: string | null;
  onSelectAchievement: (achievementId: string) => void;
};

export function AchievementsTab({ achievements, selectedAchievementId, onSelectAchievement }: AchievementsTabProps) {
  const selectedAchievement = findSelectedAchievement(achievements.achievements, selectedAchievementId);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {achievements.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Campaign milestones</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{achievements.description}</p>
        {achievements.achievements.length > 0 ? (
          <div className="mt-4">
            <AchievementBadgeGrid
              achievements={achievements.achievements}
              selectedAchievementId={selectedAchievement?.id ?? null}
              onSelectAchievement={onSelectAchievement}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-300">{achievements.emptyMessage}</p>
        )}
      </div>
      <AchievementMilestoneDetail achievement={selectedAchievement} emptyMessage={achievements.emptyMessage} />
    </section>
  );
}

function findSelectedAchievement(achievements: AchievementView[], selectedAchievementId: string | null) {
  return achievements.find((achievement) => achievement.id === selectedAchievementId) ?? achievements[0] ?? null;
}
