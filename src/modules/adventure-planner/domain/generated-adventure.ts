export type GeneratedAdventure = {
  title: string;
  themeSummary: string;
  goalSummary: string;
  safetyNotes: string[];
  acts: GeneratedAdventureAct[];
  skills: GeneratedAdventureSkill[];
  inventoryItems: GeneratedAdventureInventoryItem[];
  achievements: GeneratedAdventureAchievement[];
  focusedNextActions: GeneratedAdventureFocusedNextAction[];
};

export type GeneratedAdventureAct = {
  key: string;
  title: string;
  summary: string;
  sequenceNumber: number;
  mainQuests: GeneratedAdventureQuest[];
  sideQuests: GeneratedAdventureQuest[];
  bossFights: GeneratedAdventureBossFight[];
};

export type GeneratedAdventureQuestStep = {
  key: string;
  description: string;
  sequenceNumber: number;
};

export type GeneratedAdventureQuest = {
  key: string;
  type: "main" | "side";
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  steps: GeneratedAdventureQuestStep[];
  status: "not_started";
  sequenceNumber: number;
  skillRewards: GeneratedAdventureSkillReward[];
  inventoryItemKeys: string[];
};

export type GeneratedAdventureBossFight = {
  key: string;
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  status: "not_started";
  sequenceNumber: number;
  skillRewards: GeneratedAdventureSkillReward[];
  inventoryItemKeys: string[];
};

export type GeneratedAdventureSkillReward = {
  skillKey: string;
  xp: number;
};

export type GeneratedAdventureSkill = {
  key: string;
  name: string;
  description: string;
  xp: 0;
  level: 1;
};

export type GeneratedAdventureInventoryItem = {
  key: string;
  name: string;
  purpose: string;
  status: "needed";
  acquiredAt: null;
  sequenceNumber: number;
};

export type GeneratedAdventureAchievement = {
  key: string;
  name: string;
  description: string;
  unlockCondition: string;
  status: "locked";
  unlockedAt: null;
  sequenceNumber: number;
};

export type GeneratedAdventureFocusedNextAction = {
  title: string;
  description: string;
  sequenceNumber: number;
};

type QuestType = GeneratedAdventureQuest["type"];

export function parseGeneratedAdventure(input: unknown): GeneratedAdventure {
  const record = readRecord(input, "Generated adventure must be an object.");

  const skills = readRequiredArray(record, "skills", (item, index) => parseSkill(item, index));
  const inventoryItems = readRequiredArray(record, "inventoryItems", (item, index) =>
    parseInventoryItem(item, index),
  );
  const skillKeys = collectUniqueKeys(skills, "skills");
  const inventoryItemKeys = collectUniqueKeys(inventoryItems, "inventoryItems");

  const acts = readRequiredArray(record, "acts", (item, index) =>
    parseAct(item, index, skillKeys, inventoryItemKeys),
  );
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

function parseAct(
  input: unknown,
  index: number,
  skillKeys: ReadonlySet<string>,
  inventoryItemKeys: ReadonlySet<string>,
): GeneratedAdventureAct {
  const record = readRecord(input, `acts[${index}] must be an object.`);

  const mainQuests = readRequiredArray(record, "mainQuests", (item, questIndex) =>
    parseQuest(item, questIndex, "main", skillKeys, inventoryItemKeys),
  );
  const sideQuests = readRequiredArray(record, "sideQuests", (item, questIndex) =>
    parseQuest(item, questIndex, "side", skillKeys, inventoryItemKeys),
  );
  const bossFights = readRequiredArray(record, "bossFights", (item, bossIndex) =>
    parseBossFight(item, bossIndex, skillKeys, inventoryItemKeys),
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
  type: QuestType,
  skillKeys: ReadonlySet<string>,
  inventoryItemKeys: ReadonlySet<string>,
): GeneratedAdventureQuest {
  const record = readRecord(input, `${type}Quests[${index}] must be an object.`);

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
    skillRewards: readSkillRewards(record, skillKeys),
    inventoryItemKeys: readInventoryItemReferences(record, inventoryItemKeys),
  };
}

function parseBossFight(
  input: unknown,
  index: number,
  skillKeys: ReadonlySet<string>,
  inventoryItemKeys: ReadonlySet<string>,
): GeneratedAdventureBossFight {
  const path = `bossFights[${index}]`;
  const record = readRecord(input, `${path} must be an object.`);
  rejectQuestStepFields(record, path);

  return {
    key: readRequiredText(record, "key"),
    title: readRequiredText(record, "title"),
    description: readRequiredText(record, "description"),
    doneCondition: readRequiredText(record, "doneCondition"),
    rewardIntent: readRequiredText(record, "rewardIntent"),
    status: "not_started",
    sequenceNumber: index + 1,
    skillRewards: readSkillRewards(record, skillKeys),
    inventoryItemKeys: readInventoryItemReferences(record, inventoryItemKeys),
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

function readQuestSteps(input: Record<string, unknown>, path: string): GeneratedAdventureQuestStep[] {
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

function readSkillRewards(
  input: Record<string, unknown>,
  skillKeys: ReadonlySet<string>,
): GeneratedAdventureSkillReward[] {
  return readRequiredArray(input, "skillRewards", (item, index) => {
    const reward = readRecord(item, `skillRewards[${index}] must be an object.`);
    const skillKey = readRequiredText(reward, "skillKey");
    const xp = readPositiveInteger(reward, "xp");

    if (!skillKeys.has(skillKey)) {
      throw new Error(`skillRewards[${index}].skillKey references unknown skill: ${skillKey}.`);
    }

    return { skillKey, xp };
  });
}

function readInventoryItemReferences(
  input: Record<string, unknown>,
  inventoryItemKeys: ReadonlySet<string>,
): string[] {
  return readArray(input, "inventoryItemKeys", (item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`inventoryItemKeys[${index}] must be a non-empty string.`);
    }

    const inventoryItemKey = item.trim();
    if (!inventoryItemKeys.has(inventoryItemKey)) {
      throw new Error(
        `inventoryItemKeys[${index}] references unknown inventory item: ${inventoryItemKey}.`,
      );
    }

    return inventoryItemKey;
  });
}

function readRequiredText(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Generated adventure field ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readPositiveInteger(input: Record<string, unknown>, field: string): number {
  const value = input[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`Generated adventure field ${field} must be a positive integer.`);
  }

  return value;
}

function readTextArray(input: Record<string, unknown>, field: string): string[] {
  const value = input[field];
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Generated adventure field ${field} must be an array of strings.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`Generated adventure field ${field}[${index}] must be a non-empty string.`);
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
    throw new Error(`Generated adventure field ${field} must be a non-empty array.`);
  }

  return value.map(parseItem);
}

function readArray<T>(
  input: Record<string, unknown>,
  field: string,
  parseItem: (item: unknown, index: number) => T,
): T[] {
  const value = input[field];
  if (!Array.isArray(value)) {
    throw new Error(`Generated adventure field ${field} must be an array.`);
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
      throw new Error(`Generated adventure field ${field} contains duplicate key: ${item.key}.`);
    }

    keys.add(item.key);
  }

  return keys;
}
