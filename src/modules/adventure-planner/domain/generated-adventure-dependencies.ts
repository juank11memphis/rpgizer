import type { GeneratedAdventureContent } from "./generated-adventure-content";
import {
  listGeneratedAdventureContentBossFightKeys,
  listGeneratedAdventureContentInventoryItemKeys,
  listGeneratedAdventureContentQuestKeys,
  listGeneratedAdventureContentSkillKeys,
} from "./generated-adventure-content";

export type GeneratedAdventureDependencyLinks = {
  questLinks: GeneratedAdventureQuestDependencyLink[];
  bossFightLinks: GeneratedAdventureBossFightDependencyLink[];
};

export type GeneratedAdventureQuestDependencyLink = {
  questKey: string;
  skillKeys: string[];
  inventoryItemKeys: string[];
};

export type GeneratedAdventureBossFightDependencyLink = {
  bossFightKey: string;
  skillKeys: string[];
  inventoryItemKeys: string[];
};

export function parseGeneratedAdventureDependencyLinks(
  input: unknown,
  content: GeneratedAdventureContent,
): GeneratedAdventureDependencyLinks {
  const record = readRecord(input, "Generated adventure dependency links must be an object.");
  const skillKeys = listGeneratedAdventureContentSkillKeys(content);
  const inventoryItemKeys = listGeneratedAdventureContentInventoryItemKeys(content);
  const expectedQuestKeys = listGeneratedAdventureContentQuestKeys(content);
  const expectedBossFightKeys = listGeneratedAdventureContentBossFightKeys(content);

  const questLinks = readRequiredArray(record, "questLinks", (item, index) =>
    parseQuestLink(item, index, expectedQuestKeys, skillKeys, inventoryItemKeys),
  );
  const bossFightLinks = readRequiredArray(record, "bossFightLinks", (item, index) =>
    parseBossFightLink(item, index, expectedBossFightKeys, skillKeys, inventoryItemKeys),
  );

  assertExactLinkCoverage(
    questLinks.map((link) => link.questKey),
    expectedQuestKeys,
    "questLinks",
  );
  assertExactLinkCoverage(
    bossFightLinks.map((link) => link.bossFightKey),
    expectedBossFightKeys,
    "bossFightLinks",
  );

  return { questLinks, bossFightLinks };
}

function parseQuestLink(
  input: unknown,
  index: number,
  questKeys: ReadonlySet<string>,
  skillKeys: ReadonlySet<string>,
  inventoryItemKeys: ReadonlySet<string>,
): GeneratedAdventureQuestDependencyLink {
  const record = readRecord(input, `questLinks[${index}] must be an object.`);
  const questKey = readKnownKey(record, "questKey", questKeys, `questLinks[${index}]`);

  return {
    questKey,
    skillKeys: readLinkedKeys(record, "skillKeys", skillKeys, `questLinks[${index}]`, true),
    inventoryItemKeys: readLinkedKeys(
      record,
      "inventoryItemKeys",
      inventoryItemKeys,
      `questLinks[${index}]`,
      false,
    ),
  };
}

function parseBossFightLink(
  input: unknown,
  index: number,
  bossFightKeys: ReadonlySet<string>,
  skillKeys: ReadonlySet<string>,
  inventoryItemKeys: ReadonlySet<string>,
): GeneratedAdventureBossFightDependencyLink {
  const record = readRecord(input, `bossFightLinks[${index}] must be an object.`);
  const bossFightKey = readKnownKey(
    record,
    "bossFightKey",
    bossFightKeys,
    `bossFightLinks[${index}]`,
  );

  return {
    bossFightKey,
    skillKeys: readLinkedKeys(record, "skillKeys", skillKeys, `bossFightLinks[${index}]`, true),
    inventoryItemKeys: readLinkedKeys(
      record,
      "inventoryItemKeys",
      inventoryItemKeys,
      `bossFightLinks[${index}]`,
      false,
    ),
  };
}

function readKnownKey(
  input: Record<string, unknown>,
  field: string,
  knownKeys: ReadonlySet<string>,
  path: string,
): string {
  const key = readText(input, field, path);
  if (!knownKeys.has(key)) {
    throw new Error(`${path}.${field} references unknown key: ${key}.`);
  }

  return key;
}

function readLinkedKeys(
  input: Record<string, unknown>,
  field: string,
  knownKeys: ReadonlySet<string>,
  path: string,
  mustBeNonEmpty: boolean,
): string[] {
  const value = input[field];
  if (!Array.isArray(value) || (mustBeNonEmpty && value.length === 0)) {
    throw new Error(`${path}.${field} must be ${mustBeNonEmpty ? "a non-empty" : "an"} array.`);
  }

  const parsed = value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${path}.${field}[${index}] must be a non-empty string.`);
    }

    const key = item.trim();
    if (!knownKeys.has(key)) {
      throw new Error(`${path}.${field}[${index}] references unknown key: ${key}.`);
    }

    return key;
  });

  assertNoDuplicates(parsed, `${path}.${field}`);
  return parsed;
}

function assertExactLinkCoverage(
  actualKeys: string[],
  expectedKeys: ReadonlySet<string>,
  field: string,
): void {
  assertNoDuplicates(actualKeys, field);

  for (const expectedKey of expectedKeys) {
    if (!actualKeys.includes(expectedKey)) {
      throw new Error(`${field} is missing a link record for key: ${expectedKey}.`);
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
    throw new Error(`Generated adventure dependency field ${field} must be a non-empty array.`);
  }

  return value.map(parseItem);
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }

  return input as Record<string, unknown>;
}
