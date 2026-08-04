import type { AchievementView } from "./adventure-detail-menu-types";
import { AchievementBadgeCard } from "./achievement-badge-card";

type AchievementBadgeGridProps = {
  achievements: AchievementView[];
  selectedAchievementId: string | null;
  onSelectAchievement: (achievementId: string) => void;
};

export function AchievementBadgeGrid({
  achievements,
  selectedAchievementId,
  onSelectAchievement,
}: AchievementBadgeGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {achievements.map((achievement) => (
        <AchievementBadgeCard
          key={achievement.id}
          achievement={achievement}
          isSelected={achievement.id === selectedAchievementId}
          onSelect={onSelectAchievement}
        />
      ))}
    </div>
  );
}
