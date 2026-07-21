import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
import {
  listGeneratedAdventureContentBossFightKeys,
  listGeneratedAdventureContentInventoryItemKeys,
  listGeneratedAdventureContentQuestKeys,
  listGeneratedAdventureContentSkillKeys,
} from "../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import {
  buildAdventureQualityAssertionOutcomes,
  type AdventureQualityAssertionOutcome,
  type AdventureQualityDiagnostic,
  type AdventureQualityDiagnosticArea,
} from "./generate-adventure-eval-types";

export type AdventureLinkingQualityCheckResult = {
  diagnostics: AdventureQualityDiagnostic[];
  assertions: AdventureQualityAssertionOutcome[];
};

const ADVENTURE_LINKING_QUALITY_AREAS: readonly AdventureQualityDiagnosticArea[] = ["references"];

export type AdventureLinkingExpectations = {
  expectedInventoryCoverage: string[];
};

export function checkAdventureLinkingQuality(
  content: GeneratedAdventureContent,
  links: GeneratedAdventureDependencyLinks,
  expectations: AdventureLinkingExpectations = { expectedInventoryCoverage: [] },
): AdventureLinkingQualityCheckResult {
  const diagnostics: AdventureQualityDiagnostic[] = [];
  const questKeys = listGeneratedAdventureContentQuestKeys(content);
  const bossFightKeys = listGeneratedAdventureContentBossFightKeys(content);
  const skillKeys = listGeneratedAdventureContentSkillKeys(content);
  const inventoryItemKeys = listGeneratedAdventureContentInventoryItemKeys(content);

  checkCoverage(links.questLinks.map((link) => link.questKey), questKeys, "questLinks", diagnostics);
  checkCoverage(
    links.bossFightLinks.map((link) => link.bossFightKey),
    bossFightKeys,
    "bossFightLinks",
    diagnostics,
  );

  for (const link of links.questLinks) {
    checkLinkRow(link.questKey, link.skillKeys, link.inventoryItemKeys, skillKeys, inventoryItemKeys, diagnostics);
  }

  for (const link of links.bossFightLinks) {
    checkLinkRow(link.bossFightKey, link.skillKeys, link.inventoryItemKeys, skillKeys, inventoryItemKeys, diagnostics);
  }

  for (const key of expectations.expectedInventoryCoverage) {
    const row = [...links.questLinks, ...links.bossFightLinks].find((link) => getLinkKey(link) === key);
    if (row !== undefined && row.inventoryItemKeys.length === 0) {
      diagnostics.push({
        area: "references",
        message: `${key} expected at least one relevant Inventory Item link.`,
      });
    }
  }

  checkNoXpFields(links, diagnostics);

  return {
    diagnostics,
    assertions: buildAdventureQualityAssertionOutcomes(ADVENTURE_LINKING_QUALITY_AREAS, diagnostics),
  };
}

function checkCoverage(
  actualKeys: string[],
  expectedKeys: ReadonlySet<string>,
  field: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const seen = new Set<string>();

  for (const key of actualKeys) {
    if (seen.has(key)) {
      diagnostics.push({ area: "references", message: `${field} has duplicate coverage for ${key}.` });
    }
    seen.add(key);

    if (!expectedKeys.has(key)) {
      diagnostics.push({ area: "references", message: `${field} references unknown key ${key}.` });
    }
  }

  for (const expectedKey of expectedKeys) {
    if (!seen.has(expectedKey)) {
      diagnostics.push({ area: "references", message: `${field} is missing coverage for ${expectedKey}.` });
    }
  }
}

function checkLinkRow(
  rowKey: string,
  linkedSkillKeys: string[],
  linkedInventoryItemKeys: string[],
  knownSkillKeys: ReadonlySet<string>,
  knownInventoryItemKeys: ReadonlySet<string>,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (linkedSkillKeys.length === 0) {
    diagnostics.push({ area: "references", message: `${rowKey} expected at least one Skill link.` });
  }

  checkKnownKeys(`${rowKey}.skillKeys`, linkedSkillKeys, knownSkillKeys, diagnostics);
  checkKnownKeys(`${rowKey}.inventoryItemKeys`, linkedInventoryItemKeys, knownInventoryItemKeys, diagnostics);
}

function checkKnownKeys(
  label: string,
  actualKeys: string[],
  knownKeys: ReadonlySet<string>,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const key of actualKeys) {
    if (seen.has(key)) {
      diagnostics.push({ area: "references", message: `${label} contains duplicate key ${key}.` });
    }
    seen.add(key);

    if (!knownKeys.has(key)) {
      diagnostics.push({ area: "references", message: `${label} references unknown key ${key}.` });
    }
  }
}

function checkNoXpFields(
  links: GeneratedAdventureDependencyLinks,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const row of [...links.questLinks, ...links.bossFightLinks] as Array<Record<string, unknown>>) {
    if ("skillRewards" in row || "xp" in row) {
      diagnostics.push({ area: "references", message: "linking output must not include XP fields." });
    }
  }
}

function getLinkKey(
  link: GeneratedAdventureDependencyLinks["questLinks"][number] | GeneratedAdventureDependencyLinks["bossFightLinks"][number],
): string {
  return "questKey" in link ? link.questKey : link.bossFightKey;
}
