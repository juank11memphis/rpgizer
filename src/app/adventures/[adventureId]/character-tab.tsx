import type { CharacterSkillView, CharacterTabView } from "./adventure-detail-menu-types";
import { CharacterSkillDetail } from "./character-skill-detail";
import { CharacterSkillGrid } from "./character-skill-grid";

type CharacterTabProps = {
  character: CharacterTabView;
  selectedSkillId: string | null;
  onSelectSkill: (skillId: string) => void;
};

export function CharacterTab({ character, selectedSkillId, onSelectSkill }: CharacterTabProps) {
  const selectedSkill = findSelectedSkill(character.skills, selectedSkillId);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
      <div className="rounded-xl border border-amber-200/15 bg-black/25 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/70">
          {character.label}
        </p>
        <h2 className="mt-3 font-serif text-2xl text-amber-100">Your Adventure skills</h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">{character.description}</p>
        {character.skills.length > 0 ? (
          <div className="mt-4">
            <CharacterSkillGrid skills={character.skills} selectedSkillId={selectedSkill?.id ?? null} onSelectSkill={onSelectSkill} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-300">{character.emptyMessage}</p>
        )}
      </div>
      <CharacterSkillDetail skill={selectedSkill} emptyMessage={character.emptyMessage} />
    </section>
  );
}

function findSelectedSkill(skills: CharacterSkillView[], selectedSkillId: string | null) {
  return skills.find((skill) => skill.id === selectedSkillId) ?? skills[0] ?? null;
}
