import type { AchievementsTabView } from "./adventure-detail-menu-types";

type AchievementsTabProps = {
  achievements: AchievementsTabView;
};

export function AchievementsTab({ achievements }: AchievementsTabProps) {
  const firstAchievement = achievements.achievements[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {achievements.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Campaign milestones</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{achievements.description}</p>
        <p className="mt-4 text-sm text-stone-200">
          {achievements.achievements.length > 0
            ? `${achievements.achievements.length} milestones are available.`
            : achievements.emptyMessage}
        </p>
      </div>
      <div className="rounded-xl border border-amber-200/15 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          Milestone detail
        </p>
        {firstAchievement ? (
          <div className="mt-3 space-y-2">
            <p className="font-serif text-xl text-amber-100">◇ {firstAchievement.name}</p>
            <p className="text-sm text-emerald-100">{firstAchievement.statusLabel}</p>
            <p className="text-sm leading-6 text-stone-300">{firstAchievement.unlockCondition}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">{achievements.emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
