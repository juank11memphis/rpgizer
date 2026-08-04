import type { CharacterSkillView } from "./adventure-detail-menu-types";

type CharacterSkillCardProps = {
  skill: CharacterSkillView;
  isSelected: boolean;
  onSelect: (skillId: string) => void;
};

export function CharacterSkillCard({ skill, isSelected, onSelect }: CharacterSkillCardProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(skill.id)}
      className={`min-h-32 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
        isSelected
          ? "border-amber-200/70 bg-amber-200/10 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
          : "border-amber-200/15 bg-black/25 hover:border-amber-200/40 hover:bg-amber-200/5"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-serif text-lg uppercase leading-tight text-amber-100">{skill.name}</span>
        <span className="shrink-0 text-sm text-emerald-100">Lv {skill.level}</span>
      </span>
      <span className="mt-3 block text-sm text-stone-200">{skill.xpLabel}</span>
      <span className="mt-3 line-clamp-3 block text-sm leading-5 text-stone-300">{skill.description}</span>
    </button>
  );
}
