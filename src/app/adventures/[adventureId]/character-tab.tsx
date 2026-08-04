import type { CharacterTabView } from "./adventure-detail-menu-types";

type CharacterTabProps = {
  character: CharacterTabView;
};

export function CharacterTab({ character }: CharacterTabProps) {
  const firstSkill = character.skills[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {character.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Your Adventure skills</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{character.description}</p>
        <p className="mt-4 text-sm text-stone-200">
          {character.skills.length > 0 ? `${character.skills.length} skills guide this build.` : character.emptyMessage}
        </p>
      </div>
      <div className="rounded-xl border border-amber-200/15 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          Skill detail
        </p>
        {firstSkill ? (
          <div className="mt-3 space-y-2">
            <p className="font-serif text-xl text-amber-100">{firstSkill.name}</p>
            <p className="text-sm text-emerald-100">{firstSkill.levelLabel}</p>
            <p className="text-sm text-stone-200">{firstSkill.xpLabel}</p>
            <p className="text-sm leading-6 text-stone-300">{firstSkill.description}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">{character.emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
