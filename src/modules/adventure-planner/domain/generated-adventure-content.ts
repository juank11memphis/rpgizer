import type {
  GeneratedAdventureAchievement,
  GeneratedAdventureFocusedNextAction,
  GeneratedAdventureInventoryItem,
  GeneratedAdventureSkill,
} from "./generated-adventure";

export type GeneratedAdventureContent = {
  title: string;
  themeSummary: string;
  goalSummary: string;
  safetyNotes: string[];
  acts: GeneratedAdventureContentAct[];
  skills: GeneratedAdventureSkill[];
  inventoryItems: GeneratedAdventureInventoryItem[];
  achievements: GeneratedAdventureAchievement[];
  focusedNextActions: GeneratedAdventureFocusedNextAction[];
};

export type GeneratedAdventureContentAct = {
  key: string;
  title: string;
  summary: string;
  sequenceNumber: number;
  mainQuests: GeneratedAdventureContentQuest[];
  sideQuests: GeneratedAdventureContentQuest[];
  bossFights: GeneratedAdventureContentBossFight[];
};

export type GeneratedAdventureContentQuestStep = {
  key: string;
  description: string;
  sequenceNumber: number;
};

export type GeneratedAdventureContentQuest = {
  key: string;
  type: "main" | "side";
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  steps: GeneratedAdventureContentQuestStep[];
  status: "not_started";
  sequenceNumber: number;
};

export type GeneratedAdventureContentBossFight = Omit<GeneratedAdventureContentQuest, "type" | "steps">;

export function parseGeneratedAdventureContent(input: unknown): GeneratedAdventureContent {
  const record = readRecord(input, "Generated adventure content must be an object.");

  const skills = readRequiredArray(record, "skills", (item, index) => parseSkill(item, index));
  const inventoryItems = readRequiredArray(record, "inventoryItems", (item, index) =>
    parseInventoryItem(item, index),
  );
  const acts = readRequiredArray(record, "acts", (item, index) => parseAct(item, index));

  collectUniqueKeys(skills, "skills");
  collectUniqueKeys(inventoryItems, "inventoryItems");
  collectUniqueKeys(acts, "acts");

  return {
    title: readRequiredText(record, "title"),
    themeSummary: readRequiredText(record, "themeSummary"),
    goalSummary: readRequiredText(record, "goalSummary"),
    safetyNotes: readTextArray(record, "safetyNotes"),
    acts,
    skills,
    inventoryItems,
    achievements: readRequiredArray(record, "achievements", (item, index) =>
      parseAchievement(item, index),
    ),
    focusedNextActions: readRequiredArray(record, "focusedNextActions", (item, index) =>
      parseFocusedNextAction(item, index),
    ),
  };
}

export function listGeneratedAdventureContentQuestKeys(
  content: GeneratedAdventureContent,
): ReadonlySet<string> {
  return new Set(content.acts.flatMap((act) => [...act.mainQuests, ...act.sideQuests].map((q) => q.key)));
}

export function listGeneratedAdventureContentBossFightKeys(
  content: GeneratedAdventureContent,
): ReadonlySet<string> {
  return new Set(content.acts.flatMap((act) => act.bossFights.map((bossFight) => bossFight.key)));
}

export function listGeneratedAdventureContentSkillKeys(
  content: GeneratedAdventureContent,
): ReadonlySet<string> {
  return new Set(content.skills.map((skill) => skill.key));
}

export function listGeneratedAdventureContentInventoryItemKeys(
  content: GeneratedAdventureContent,
): ReadonlySet<string> {
  return new Set(content.inventoryItems.map((item) => item.key));
}

function parseAct(input: unknown, index: number): GeneratedAdventureContentAct {
  const record = readRecord(input, `acts[${index}] must be an object.`);
  const mainQuests = readRequiredArray(record, "mainQuests", (item, questIndex) =>
    parseQuest(item, questIndex, "main"),
  );
  const sideQuests = readRequiredArray(record, "sideQuests", (item, questIndex) =>
    parseQuest(item, questIndex, "side"),
  );
  const bossFights = readRequiredArray(record, "bossFights", (item, bossIndex) =>
    parseBossFight(item, bossIndex),
  );

  collectUniqueKeys(mainQuests, `acts[${index}].mainQuests`);
  collectUniqueKeys(sideQuests, `acts[${index}].sideQuests`);
  collectUniqueKeys(bossFights, `acts[${index}].bossFights`);

  return {
    key: readRequiredText(record, "key"),
    title: readRequiredText(record, "title"),
    summary: readRequiredText(record, "summary"),
    sequenceNumber: index + 1,
    mainQuests,
    sideQuests,
    bossFights,
  };
}

function parseQuest(
  input: unknown,
  index: number,
  type: GeneratedAdventureContentQuest["type"],
): GeneratedAdventureContentQuest {
  const record = readRecord(input, `${type}Quests[${index}] must be an object.`);
  rejectDependencyFields(record, `${type}Quests[${index}]`);

  return {
    key: readRequiredText(record, "key"),
    type,
    title: readRequiredText(record, "title"),
    description: readRequiredText(record, "description"),
    doneCondition: readRequiredText(record, "doneCondition"),
    rewardIntent: readRequiredText(record, "rewardIntent"),
    steps: readQuestSteps(record, `${type}Quests[${index}]`),
    status: "not_started",
    sequenceNumber: index + 1,
  };
}

function parseBossFight(input: unknown, index: number): GeneratedAdventureContentBossFight {
  const path = `bossFights[${index}]`;
  const record = readRecord(input, `${path} must be an object.`);
  rejectDependencyFields(record, path);
  rejectQuestStepFields(record, path);

  return {
    key: readRequiredText(record, "key"),
    title: readRequiredText(record, "title"),
    description: readRequiredText(record, "description"),
    doneCondition: readRequiredText(record, "doneCondition"),
    rewardIntent: readRequiredText(record, "rewardIntent"),
    status: "not_started",
    sequenceNumber: index + 1,
  };
}

function parseSkill(input: unknown, index: number): GeneratedAdventureSkill {
  const record = readRecord(input, `skills[${index}] must be an object.`);

  return {
    key: readRequiredText(record, "key"),
    name: readRequiredText(record, "name"),
    description: readRequiredText(record, "description"),
    xp: 0,
    level: 1,
  };
}

function parseInventoryItem(input: unknown, index: number): GeneratedAdventureInventoryItem {
  const record = readRecord(input, `inventoryItems[${index}] must be an object.`);

  return {
    key: readRequiredText(record, "key"),
    name: readRequiredText(record, "name"),
    purpose: readRequiredText(record, "purpose"),
    status: "needed",
    acquiredAt: null,
    sequenceNumber: index + 1,
  };
}

function parseAchievement(input: unknown, index: number): GeneratedAdventureAchievement {
  const record = readRecord(input, `achievements[${index}] must be an object.`);

  return {
    key: readRequiredText(record, "key"),
    name: readRequiredText(record, "name"),
    description: readRequiredText(record, "description"),
    unlockCondition: readRequiredText(record, "unlockCondition"),
    status: "locked",
    unlockedAt: null,
    sequenceNumber: index + 1,
  };
}

function parseFocusedNextAction(input: unknown, index: number): GeneratedAdventureFocusedNextAction {
  const record = readRecord(input, `focusedNextActions[${index}] must be an object.`);

  return {
    title: readRequiredText(record, "title"),
    description: readRequiredText(record, "description"),
    sequenceNumber: index + 1,
  };
}

function readQuestSteps(
  input: Record<string, unknown>,
  path: string,
): GeneratedAdventureContentQuestStep[] {
  const steps = readRequiredArray(input, "steps", (item, index) => {
    const step = readRecord(item, `${path}.steps[${index}] must be an object.`);

    return {
      key: readRequiredText(step, "key"),
      description: readRequiredText(step, "description"),
      sequenceNumber: index + 1,
    };
  });

  if (steps.length < 2 || steps.length > 7) {
    throw new Error(`${path}.steps must include between 2 and 7 Quest Steps.`);
  }

  collectUniqueKeys(steps, `${path}.steps`);

  return steps;
}

function rejectQuestStepFields(input: Record<string, unknown>, path: string): void {
  if ("steps" in input) {
    throw new Error(`${path} must not include Quest Steps.`);
  }
}

function rejectDependencyFields(input: Record<string, unknown>, path: string): void {
  const forbiddenFields = ["skillRewards", "inventoryItemKeys", "skillKeys", "xp", "experience"];
  const presentForbiddenFields = forbiddenFields.filter((field) => field in input);

  if (presentForbiddenFields.length > 0) {
    throw new Error(
      `${path} must not include dependency or XP fields before dependency linking: ${presentForbiddenFields.join(", ")}.`,
    );
  }
}

function readRequiredText(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Generated adventure content field ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readTextArray(input: Record<string, unknown>, field: string): string[] {
  const value = input[field];
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Generated adventure content field ${field} must be an array of strings.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(
        `Generated adventure content field ${field}[${index}] must be a non-empty string.`,
      );
    }

    return item.trim();
  });
}

function readRequiredArray<T>(
  input: Record<string, unknown>,
  field: string,
  parseItem: (item: unknown, index: number) => T,
): T[] {
  const value = input[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Generated adventure content field ${field} must be a non-empty array.`);
  }

  return value.map(parseItem);
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }

  return input as Record<string, unknown>;
}

function collectUniqueKeys<T extends { key: string }>(items: T[], field: string): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const item of items) {
    if (keys.has(item.key)) {
      throw new Error(`Generated adventure content field ${field} contains duplicate key: ${item.key}.`);
    }

    keys.add(item.key);
  }

  return keys;
}
