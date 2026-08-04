import type { CharacterSkillView } from "./adventure-detail-menu-types";
import { CharacterSkillCard } from "./character-skill-card";

type CharacterSkillGridProps = {
  skills: CharacterSkillView[];
  selectedSkillId: string | null;
  onSelectSkill: (skillId: string) => void;
};

export function CharacterSkillGrid({ skills, selectedSkillId, onSelectSkill }: CharacterSkillGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {skills.map((skill) => (
        <CharacterSkillCard
          key={skill.id}
          skill={skill}
          isSelected={skill.id === selectedSkillId}
          onSelect={onSelectSkill}
        />
      ))}
    </div>
  );
}
