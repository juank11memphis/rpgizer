import type { CharacterSkillView } from "./adventure-detail-menu-types";

type CharacterSkillDetailProps = {
  skill: CharacterSkillView | null;
  emptyMessage: string;
};

export function CharacterSkillDetail({ skill, emptyMessage }: CharacterSkillDetailProps) {
  return (
    <aside className="rounded-xl border border-amber-200/15 bg-black/20 p-4 lg:min-h-72">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">Skill detail</p>
      {skill ? (
        <div className="mt-4 space-y-3">
          <h3 className="font-serif text-2xl text-amber-100">{skill.name}</h3>
          <p className="text-sm text-emerald-100">{skill.levelLabel}</p>
          <p className="text-sm text-stone-200">{skill.xpLabel}</p>
          <p className="text-sm leading-6 text-stone-300">{skill.description}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-300">{emptyMessage}</p>
      )}
    </aside>
  );
}
