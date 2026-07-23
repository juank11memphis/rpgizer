import {
  MAX_GENERATED_ADVENTURE_REWARD_XP,
  MIN_GENERATED_ADVENTURE_REWARD_XP,
  type GeneratedAdventureXpBalance,
} from "../domain/generated-adventure-xp";
import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import {
  buildAdventureQualityAssertionOutcomes,
  type AdventureQualityAssertionOutcome,
  type AdventureQualityDiagnostic,
  type AdventureQualityDiagnosticArea,
} from "./generate-adventure-eval-types";

export type AdventureXpQualityCheckResult = {
  diagnostics: AdventureQualityDiagnostic[];
  assertions: AdventureQualityAssertionOutcome[];
};

const ADVENTURE_XP_QUALITY_AREAS: readonly AdventureQualityDiagnosticArea[] = ["references"];

export function checkAdventureXpQuality(
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
  xpBalance: GeneratedAdventureXpBalance,
): AdventureXpQualityCheckResult {
  const diagnostics: AdventureQualityDiagnostic[] = [];
  const questLinks = new Map(dependencies.questLinks.map((link) => [link.questKey, new Set(link.skillKeys)]));
  const bossFightLinks = new Map(
    dependencies.bossFightLinks.map((link) => [link.bossFightKey, new Set(link.skillKeys)]),
  );

  checkXpCoverage(xpBalance.questXp.map((entry) => entry.questKey), questLinks, "questXp", diagnostics);
  checkXpCoverage(
    xpBalance.bossFightXp.map((entry) => entry.bossFightKey),
    bossFightLinks,
    "bossFightXp",
    diagnostics,
  );

  for (const entry of xpBalance.questXp) {
    checkRewards(entry.questKey, entry.skillRewards, questLinks.get(entry.questKey), diagnostics);
  }

  for (const entry of xpBalance.bossFightXp) {
    checkRewards(entry.bossFightKey, entry.skillRewards, bossFightLinks.get(entry.bossFightKey), diagnostics);
  }

  if (xpBalance.bossFightXp.some((entry) => entry.skillRewards.length === 0)) {
    diagnostics.push({ area: "references", message: "every Boss Fight expected at least one XP reward." });
  }

  checkNoRewriteFields(content, dependencies, xpBalance, diagnostics);

  return {
    diagnostics,
    assertions: buildAdventureQualityAssertionOutcomes(ADVENTURE_XP_QUALITY_AREAS, diagnostics),
  };
}

function checkXpCoverage(
  actualKeys: string[],
  expectedLinks: ReadonlyMap<string, ReadonlySet<string>>,
  field: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const key of actualKeys) {
    if (seen.has(key)) {
      diagnostics.push({ area: "references", message: `${field} has duplicate XP coverage for ${key}.` });
    }
    seen.add(key);

    if (!expectedLinks.has(key)) {
      diagnostics.push({ area: "references", message: `${field} references unknown key ${key}.` });
    }
  }

  for (const key of expectedLinks.keys()) {
    if (!seen.has(key)) {
      diagnostics.push({ area: "references", message: `${field} is missing XP coverage for ${key}.` });
    }
  }
}

function checkRewards(
  rowKey: string,
  rewards: Array<{ skillKey: string; xp: number }>,
  linkedSkillKeys: ReadonlySet<string> | undefined,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const seen = new Set<string>();
  if (rewards.length === 0) {
    diagnostics.push({ area: "references", message: `${rowKey} expected at least one XP reward.` });
  }

  for (const reward of rewards) {
    if (seen.has(reward.skillKey)) {
      diagnostics.push({ area: "references", message: `${rowKey} has duplicate XP for ${reward.skillKey}.` });
    }
    seen.add(reward.skillKey);

    if (linkedSkillKeys !== undefined && !linkedSkillKeys.has(reward.skillKey)) {
      diagnostics.push({ area: "references", message: `${rowKey} assigns XP to unlinked Skill ${reward.skillKey}.` });
    }

    if (!Number.isInteger(reward.xp) || reward.xp < MIN_GENERATED_ADVENTURE_REWARD_XP || reward.xp > MAX_GENERATED_ADVENTURE_REWARD_XP) {
      diagnostics.push({
        area: "references",
        message: `${rowKey}.${reward.skillKey} XP must be an integer from ${MIN_GENERATED_ADVENTURE_REWARD_XP} to ${MAX_GENERATED_ADVENTURE_REWARD_XP}.`,
      });
    }
  }
}

function checkNoRewriteFields(
  content: GeneratedAdventureContent,
  dependencies: GeneratedAdventureDependencyLinks,
  xpBalance: GeneratedAdventureXpBalance,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const xpRecord = xpBalance as unknown as Record<string, unknown>;
  const forbiddenFields = ["title", "acts", "skills", "inventoryItems", "questLinks", "bossFightLinks"].filter(
    (field) => field in xpRecord,
  );

  if (forbiddenFields.length > 0) {
    diagnostics.push({
      area: "references",
      message: `XP output must not rewrite content or dependency links: ${forbiddenFields.join(", ")}.`,
    });
  }

  void content;
  void dependencies;
}
