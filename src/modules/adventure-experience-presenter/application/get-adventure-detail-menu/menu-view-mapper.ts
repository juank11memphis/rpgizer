import type { AdventureDetailMenuView, JournalDetailType, JournalDetailView } from "./output";
import type {
  AdventureDetailContent,
  AdventureDetailContentAct,
  AdventureDetailContentBossFight,
  AdventureDetailContentQuest,
} from "./ports";

const MENU_TABS = [
  { id: "journal", label: "Journal" },
  { id: "inventory", label: "Inventory" },
  { id: "character", label: "Character" },
  { id: "achievements", label: "Achievements" },
] as const;

const EMPTY_MESSAGES = {
  journal: "No Journal entries yet.",
  inventory: "No inventory items yet.",
  character: "No skills yet.",
  achievements: "No achievements yet.",
} as const;

export function mapAdventureDetailMenuView(content: AdventureDetailContent): AdventureDetailMenuView {
  const skillsById = new Map(content.skills.map((skill) => [skill.id, skill]));
  const inventoryNamesById = new Map(content.inventoryItems.map((item) => [item.id, item.name]));
  const acts = [...content.acts]
    .sort(bySequenceNumber)
    .map((act) => mapJournalAct(act, skillsById, inventoryNamesById));
  const defaultSelectedAct = acts[0] ?? null;
  const defaultSelectedDetail = defaultSelectedAct ? selectDefaultJournalDetail(defaultSelectedAct) : null;
  const inventoryItems = [...content.inventoryItems].sort(bySequenceNumber).map((item) => ({
    id: item.id,
    name: item.name,
    purpose: item.purpose,
    statusLabel: "Needed" as const,
  }));
  const skills = [...content.skills].map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    level: skill.level,
    xp: skill.xp,
    levelLabel: `Lv ${skill.level}`,
    xpLabel: `XP ${skill.xp} / 100`,
  }));
  const achievements = [...content.achievements].sort(bySequenceNumber).map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    unlockCondition: achievement.unlockCondition,
    statusLabel: "Available" as const,
  }));

  return {
    header: {
      title: content.title,
      goalSummary: content.goalSummary,
      themeSummary: content.themeSummary,
      safetyNotes: [...content.safetyNotes],
    },
    tabs: [...MENU_TABS],
    journal: {
      label: "Journal",
      emptyMessage: EMPTY_MESSAGES.journal,
      defaultSelectedActId: defaultSelectedAct?.id ?? null,
      defaultSelectedDetailId: defaultSelectedDetail?.id ?? null,
      acts,
    },
    inventory: {
      label: "Inventory",
      description: "Readiness gear for the path.",
      emptyMessage: EMPTY_MESSAGES.inventory,
      defaultSelectedItemId: inventoryItems[0]?.id ?? null,
      items: inventoryItems,
    },
    character: {
      label: "Character",
      description: "Your Adventure skills.",
      emptyMessage: EMPTY_MESSAGES.character,
      defaultSelectedSkillId: skills[0]?.id ?? null,
      skills,
    },
    achievements: {
      label: "Achievements",
      description: "Campaign milestones.",
      emptyMessage: EMPTY_MESSAGES.achievements,
      defaultSelectedAchievementId: achievements[0]?.id ?? null,
      achievements,
    },
  };
}

function mapJournalAct(
  act: AdventureDetailContentAct,
  skillsById: ReadonlyMap<string, { name: string }>,
  inventoryNamesById: ReadonlyMap<string, string>,
) {
  return {
    id: act.id,
    title: act.title,
    summary: act.summary,
    mainQuests: [...act.mainQuests]
      .sort(bySequenceNumber)
      .map((quest) => mapJournalDetail(quest, "main_quest", skillsById, inventoryNamesById)),
    sideQuests: [...act.sideQuests]
      .sort(bySequenceNumber)
      .map((quest) => mapJournalDetail(quest, "side_quest", skillsById, inventoryNamesById)),
    bossFights: [...act.bossFights]
      .sort(bySequenceNumber)
      .map((bossFight) => mapJournalDetail(bossFight, "boss_fight", skillsById, inventoryNamesById)),
  };
}

function mapJournalDetail(
  detail: AdventureDetailContentQuest | AdventureDetailContentBossFight,
  type: JournalDetailType,
  skillsById: ReadonlyMap<string, { name: string }>,
  inventoryNamesById: ReadonlyMap<string, string>,
): JournalDetailView {
  return {
    id: detail.id,
    type,
    typeLabel: labelJournalDetailType(type),
    title: detail.title,
    description: detail.description,
    doneCondition: detail.doneCondition,
    rewardIntent: detail.rewardIntent,
    statusLabel: "Not started",
    steps: mapJournalDetailSteps(detail, type),
    skillRewards: detail.skillRewards.map((reward) => {
      const skillName = skillsById.get(reward.skillId)?.name ?? reward.skillId;
      return {
        skillId: reward.skillId,
        skillName,
        xp: reward.xp,
        label: `+${reward.xp} ${skillName}`,
      };
    }),
    linkedInventoryNames: detail.inventoryItemIds.map(
      (inventoryItemId) => inventoryNamesById.get(inventoryItemId) ?? inventoryItemId,
    ),
  };
}

function mapJournalDetailSteps(
  detail: AdventureDetailContentQuest | AdventureDetailContentBossFight,
  type: JournalDetailType,
) {
  if (type === "boss_fight") {
    return [];
  }

  return mapQuestSteps((detail as AdventureDetailContentQuest).steps);
}

function mapQuestSteps(steps: AdventureDetailContentQuest["steps"] = []) {
  return [...steps]
    .sort(bySequenceNumber)
    .map((step) => ({ id: step.id, description: step.description }));
}

function selectDefaultJournalDetail(act: {
  mainQuests: JournalDetailView[];
  sideQuests: JournalDetailView[];
  bossFights: JournalDetailView[];
}): JournalDetailView | null {
  return act.mainQuests[0] ?? act.sideQuests[0] ?? act.bossFights[0] ?? null;
}

function labelJournalDetailType(type: JournalDetailType): string {
  if (type === "main_quest") return "Main Quest";
  if (type === "side_quest") return "Side Quest";
  return "Boss Fight";
}

function bySequenceNumber<T extends { sequenceNumber: number }>(left: T, right: T): number {
  return left.sequenceNumber - right.sequenceNumber;
}
