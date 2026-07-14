import type { GeneratedAdventureDependencyLinks } from "./generated-adventure-dependencies";

export const MIN_GENERATED_ADVENTURE_REWARD_XP = 5;
export const MAX_GENERATED_ADVENTURE_REWARD_XP = 100;

export type GeneratedAdventureXpBalance = {
  questXp: GeneratedAdventureQuestXp[];
  bossFightXp: GeneratedAdventureBossFightXp[];
};

export type GeneratedAdventureQuestXp = {
  questKey: string;
  skillRewards: GeneratedAdventureXpReward[];
};

export type GeneratedAdventureBossFightXp = {
  bossFightKey: string;
  skillRewards: GeneratedAdventureXpReward[];
};

export type GeneratedAdventureXpReward = {
  skillKey: string;
  xp: number;
};

export function parseGeneratedAdventureXpBalance(
  input: unknown,
  dependencies: GeneratedAdventureDependencyLinks,
): GeneratedAdventureXpBalance {
  const record = readRecord(input, "Generated adventure XP balance must be an object.");
  const questSkillLinks = new Map(
    dependencies.questLinks.map((link) => [link.questKey, new Set(link.skillKeys)]),
  );
  const bossFightSkillLinks = new Map(
    dependencies.bossFightLinks.map((link) => [link.bossFightKey, new Set(link.skillKeys)]),
  );

  const questXp = readRequiredArray(record, "questXp", (item, index) =>
    parseQuestXp(item, index, questSkillLinks),
  );
  const bossFightXp = readRequiredArray(record, "bossFightXp", (item, index) =>
    parseBossFightXp(item, index, bossFightSkillLinks),
  );

  assertExactXpCoverage(
    questXp.map((entry) => entry.questKey),
    questSkillLinks,
    "questXp",
  );
  assertExactXpCoverage(
    bossFightXp.map((entry) => entry.bossFightKey),
    bossFightSkillLinks,
    "bossFightXp",
  );

  return { questXp, bossFightXp };
}

function parseQuestXp(
  input: unknown,
  index: number,
  linkedSkillKeysByQuestKey: ReadonlyMap<string, ReadonlySet<string>>,
): GeneratedAdventureQuestXp {
  const record = readRecord(input, `questXp[${index}] must be an object.`);
  const questKey = readKnownRecordKey(record, "questKey", linkedSkillKeysByQuestKey, `questXp[${index}]`);
  const linkedSkillKeys = linkedSkillKeysByQuestKey.get(questKey) ?? new Set<string>();

  return {
    questKey,
    skillRewards: readSkillRewards(record, linkedSkillKeys, `questXp[${index}]`),
  };
}

function parseBossFightXp(
  input: unknown,
  index: number,
  linkedSkillKeysByBossFightKey: ReadonlyMap<string, ReadonlySet<string>>,
): GeneratedAdventureBossFightXp {
  const record = readRecord(input, `bossFightXp[${index}] must be an object.`);
  const bossFightKey = readKnownRecordKey(
    record,
    "bossFightKey",
    linkedSkillKeysByBossFightKey,
    `bossFightXp[${index}]`,
  );
  const linkedSkillKeys = linkedSkillKeysByBossFightKey.get(bossFightKey) ?? new Set<string>();

  return {
    bossFightKey,
    skillRewards: readSkillRewards(record, linkedSkillKeys, `bossFightXp[${index}]`),
  };
}

function readSkillRewards(
  input: Record<string, unknown>,
  linkedSkillKeys: ReadonlySet<string>,
  path: string,
): GeneratedAdventureXpReward[] {
  const value = input.skillRewards;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path}.skillRewards must be a non-empty array.`);
  }

  const rewards = value.map((item, index) => {
    const reward = readRecord(item, `${path}.skillRewards[${index}] must be an object.`);
    const skillKey = readText(reward, "skillKey", `${path}.skillRewards[${index}]`);
    const xp = readBoundedXp(reward, `${path}.skillRewards[${index}]`);

    if (!linkedSkillKeys.has(skillKey)) {
      throw new Error(`${path}.skillRewards[${index}].skillKey references unlinked skill: ${skillKey}.`);
    }

    return { skillKey, xp };
  });

  assertNoDuplicates(
    rewards.map((reward) => reward.skillKey),
    `${path}.skillRewards`,
  );
  assertExactRewardCoverage(
    rewards.map((reward) => reward.skillKey),
    linkedSkillKeys,
    `${path}.skillRewards`,
  );

  return rewards;
}

function readBoundedXp(input: Record<string, unknown>, path: string): number {
  const value = input.xp;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${path}.xp must be a positive integer.`);
  }

  if (value < MIN_GENERATED_ADVENTURE_REWARD_XP || value > MAX_GENERATED_ADVENTURE_REWARD_XP) {
    throw new Error(
      `${path}.xp must be between ${MIN_GENERATED_ADVENTURE_REWARD_XP} and ${MAX_GENERATED_ADVENTURE_REWARD_XP}.`,
    );
  }

  return value;
}

function readKnownRecordKey(
  input: Record<string, unknown>,
  field: string,
  knownRecords: ReadonlyMap<string, ReadonlySet<string>>,
  path: string,
): string {
  const key = readText(input, field, path);
  if (!knownRecords.has(key)) {
    throw new Error(`${path}.${field} references unknown key: ${key}.`);
  }

  return key;
}

function assertExactXpCoverage(
  actualKeys: string[],
  expectedEntries: ReadonlyMap<string, ReadonlySet<string>>,
  field: string,
): void {
  assertNoDuplicates(actualKeys, field);

  for (const expectedKey of expectedEntries.keys()) {
    if (!actualKeys.includes(expectedKey)) {
      throw new Error(`${field} is missing an XP record for key: ${expectedKey}.`);
    }
  }
}

function assertExactRewardCoverage(
  actualSkillKeys: string[],
  expectedSkillKeys: ReadonlySet<string>,
  path: string,
): void {
  for (const expectedSkillKey of expectedSkillKeys) {
    if (!actualSkillKeys.includes(expectedSkillKey)) {
      throw new Error(`${path} is missing XP for linked skill: ${expectedSkillKey}.`);
    }
  }
}

function assertNoDuplicates(keys: string[], path: string): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      throw new Error(`${path} contains duplicate key: ${key}.`);
    }

    seen.add(key);
  }
}

function readText(input: Record<string, unknown>, field: string, path: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path}.${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredArray<T>(
  input: Record<string, unknown>,
  field: string,
  parseItem: (item: unknown, index: number) => T,
): T[] {
  const value = input[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Generated adventure XP field ${field} must be a non-empty array.`);
  }

  return value.map(parseItem);
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }

  return input as Record<string, unknown>;
}
