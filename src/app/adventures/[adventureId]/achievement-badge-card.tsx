import type { AchievementView } from "./adventure-detail-menu-types";

type AchievementBadgeCardProps = {
  achievement: AchievementView;
  isSelected: boolean;
  onSelect: (achievementId: string) => void;
};

export function AchievementBadgeCard({ achievement, isSelected, onSelect }: AchievementBadgeCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(achievement.id)}
      className={`min-h-32 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
        isSelected
          ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
          : "border-amber-200/15 bg-black/25 hover:border-amber-200/40 hover:bg-amber-200/5"
      }`}
    >
      <span className="block font-serif text-lg leading-tight text-amber-100">◇ {achievement.name}</span>
      <span className="mt-3 line-clamp-2 block text-sm leading-5 text-stone-300">{achievement.unlockCondition}</span>
      <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
        {achievement.statusLabel}
      </span>
    </button>
  );
}
