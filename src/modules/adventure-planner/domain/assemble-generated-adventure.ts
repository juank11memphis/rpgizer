import { parseGeneratedAdventure, type GeneratedAdventure } from "./generated-adventure";
import type { GeneratedAdventureContent } from "./generated-adventure-content";
import type { GeneratedAdventureDependencyLinks } from "./generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "./generated-adventure-xp";

export function assembleGeneratedAdventure(input: {
  content: GeneratedAdventureContent;
  dependencies: GeneratedAdventureDependencyLinks;
  xpBalance: GeneratedAdventureXpBalance;
}): GeneratedAdventure {
  const questLinksByKey = new Map(input.dependencies.questLinks.map((link) => [link.questKey, link]));
  const bossFightLinksByKey = new Map(
    input.dependencies.bossFightLinks.map((link) => [link.bossFightKey, link]),
  );
  const questXpByKey = new Map(input.xpBalance.questXp.map((entry) => [entry.questKey, entry]));
  const bossFightXpByKey = new Map(
    input.xpBalance.bossFightXp.map((entry) => [entry.bossFightKey, entry]),
  );

  return parseGeneratedAdventure({
    title: input.content.title,
    themeSummary: input.content.themeSummary,
    goalSummary: input.content.goalSummary,
    safetyNotes: input.content.safetyNotes,
    skills: input.content.skills,
    inventoryItems: input.content.inventoryItems,
    achievements: input.content.achievements,
    focusedNextActions: input.content.focusedNextActions,
    acts: input.content.acts.map((act) => ({
      key: act.key,
      title: act.title,
      summary: act.summary,
      mainQuests: act.mainQuests.map((quest) => ({
        ...quest,
        ...readQuestLinks(questLinksByKey, quest.key),
        skillRewards: readQuestXp(questXpByKey, quest.key),
      })),
      sideQuests: act.sideQuests.map((quest) => ({
        ...quest,
        ...readQuestLinks(questLinksByKey, quest.key),
        skillRewards: readQuestXp(questXpByKey, quest.key),
      })),
      bossFights: act.bossFights.map((bossFight) => ({
        ...bossFight,
        ...readBossFightLinks(bossFightLinksByKey, bossFight.key),
        skillRewards: readBossFightXp(bossFightXpByKey, bossFight.key),
      })),
    })),
  });
}

function readQuestLinks(
  linksByKey: ReadonlyMap<string, { inventoryItemKeys: string[] }>,
  questKey: string,
): { inventoryItemKeys: string[] } {
  const links = linksByKey.get(questKey);
  if (!links) {
    throw new Error(`Missing dependency links for Quest: ${questKey}.`);
  }

  return { inventoryItemKeys: links.inventoryItemKeys };
}

function readBossFightLinks(
  linksByKey: ReadonlyMap<string, { inventoryItemKeys: string[] }>,
  bossFightKey: string,
): { inventoryItemKeys: string[] } {
  const links = linksByKey.get(bossFightKey);
  if (!links) {
    throw new Error(`Missing dependency links for Boss Fight: ${bossFightKey}.`);
  }

  return { inventoryItemKeys: links.inventoryItemKeys };
}

function readQuestXp(
  xpByKey: ReadonlyMap<string, { skillRewards: Array<{ skillKey: string; xp: number }> }>,
  questKey: string,
): Array<{ skillKey: string; xp: number }> {
  const xp = xpByKey.get(questKey);
  if (!xp) {
    throw new Error(`Missing XP balance for Quest: ${questKey}.`);
  }

  return xp.skillRewards;
}

function readBossFightXp(
  xpByKey: ReadonlyMap<string, { skillRewards: Array<{ skillKey: string; xp: number }> }>,
  bossFightKey: string,
): Array<{ skillKey: string; xp: number }> {
  const xp = xpByKey.get(bossFightKey);
  if (!xp) {
    throw new Error(`Missing XP balance for Boss Fight: ${bossFightKey}.`);
  }

  return xp.skillRewards;
}
