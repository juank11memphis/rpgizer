export type GetAdventureDetailMenuResult =
  | { status: "found"; menu: AdventureDetailMenuView }
  | { status: "not_found" }
  | { status: "not_ready" };

export type AdventureDetailMenuView = {
  header: AdventureDetailHeaderView;
  tabs: AdventureDetailMenuTabView[];
  journal: JournalTabView;
  inventory: InventoryTabView;
  character: CharacterTabView;
  achievements: AchievementsTabView;
};

export type AdventureDetailHeaderView = {
  title: string;
  goalSummary: string;
  themeSummary: string | null;
  safetyNotes: string[];
};

export type AdventureDetailMenuTabId = "journal" | "inventory" | "character" | "achievements";

export type AdventureDetailMenuTabView = {
  id: AdventureDetailMenuTabId;
  label: string;
};

export type JournalTabView = {
  label: "Journal";
  emptyMessage: string;
  defaultSelectedActId: string | null;
  defaultSelectedDetailId: string | null;
  acts: JournalActView[];
};

export type JournalActView = {
  id: string;
  title: string;
  summary: string;
  mainQuests: JournalDetailView[];
  sideQuests: JournalDetailView[];
  bossFights: JournalDetailView[];
};

export type JournalDetailType = "main_quest" | "side_quest" | "boss_fight";

export type JournalQuestStepView = {
  id: string;
  description: string;
};

export type JournalDetailView = {
  id: string;
  type: JournalDetailType;
  typeLabel: string;
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  statusLabel: "Not started";
  steps: JournalQuestStepView[];
  skillRewards: SkillRewardView[];
  linkedInventoryNames: string[];
};

export type SkillRewardView = {
  skillId: string;
  skillName: string;
  xp: number;
  label: string;
};

export type InventoryTabView = {
  label: "Inventory";
  description: string;
  emptyMessage: string;
  defaultSelectedItemId: string | null;
  items: InventoryItemView[];
};

export type InventoryItemView = {
  id: string;
  name: string;
  purpose: string;
  statusLabel: "Needed";
};

export type CharacterTabView = {
  label: "Character";
  description: string;
  emptyMessage: string;
  defaultSelectedSkillId: string | null;
  skills: CharacterSkillView[];
};

export type CharacterSkillView = {
  id: string;
  name: string;
  description: string;
  level: number;
  xp: number;
  levelLabel: string;
  xpLabel: string;
};

export type AchievementsTabView = {
  label: "Achievements";
  description: string;
  emptyMessage: string;
  defaultSelectedAchievementId: string | null;
  achievements: AchievementView[];
};

export type AchievementView = {
  id: string;
  name: string;
  description: string;
  unlockCondition: string;
  statusLabel: "Available";
};
