import type { GetAdventureDetailMenuInput } from "./input";

export type AdventureDetailContentReader = {
  findGeneratedAdventureForDisplay(
    input: GetAdventureDetailMenuInput,
  ): Promise<AdventureDetailContentReaderResult>;
};

export type AdventureDetailContentReaderResult =
  | { status: "found"; content: AdventureDetailContent }
  | { status: "not_found" }
  | { status: "not_ready" };

export type AdventureDetailContent = {
  title: string;
  themeSummary: string | null;
  goalSummary: string;
  safetyNotes: string[];
  acts: AdventureDetailContentAct[];
  skills: AdventureDetailContentSkill[];
  inventoryItems: AdventureDetailContentInventoryItem[];
  achievements: AdventureDetailContentAchievement[];
};

export type AdventureDetailContentAct = {
  id: string;
  title: string;
  summary: string;
  sequenceNumber: number;
  mainQuests: AdventureDetailContentQuest[];
  sideQuests: AdventureDetailContentQuest[];
  bossFights: AdventureDetailContentBossFight[];
};

export type AdventureDetailContentQuestStep = {
  id: string;
  description: string;
  sequenceNumber: number;
};

export type AdventureDetailContentQuest = {
  id: string;
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  sequenceNumber: number;
  steps?: AdventureDetailContentQuestStep[];
  skillRewards: AdventureDetailContentSkillReward[];
  inventoryItemIds: string[];
};

export type AdventureDetailContentBossFight = Omit<AdventureDetailContentQuest, "steps">;

export type AdventureDetailContentSkillReward = {
  skillId: string;
  xp: number;
};

export type AdventureDetailContentSkill = {
  id: string;
  name: string;
  description: string;
  xp: number;
  level: number;
};

export type AdventureDetailContentInventoryItem = {
  id: string;
  name: string;
  purpose: string;
  sequenceNumber: number;
};

export type AdventureDetailContentAchievement = {
  id: string;
  name: string;
  description: string;
  unlockCondition: string;
  sequenceNumber: number;
};
