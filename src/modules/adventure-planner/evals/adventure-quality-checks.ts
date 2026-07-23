import type {
  GeneratedAdventure,
  GeneratedAdventureBossFight,
  GeneratedAdventureQuest,
  GeneratedAdventureSkillReward,
} from "../domain/generated-adventure";
import {
  MAX_GENERATED_ADVENTURE_REWARD_XP,
  MIN_GENERATED_ADVENTURE_REWARD_XP,
} from "../domain/generated-adventure-xp";
import { buildAdventureQualityAssertionOutcomes } from "./generate-adventure-eval-types";
import type {
  AdventureQualityCheckResult,
  AdventureQualityDiagnostic,
  AdventureQualityDiagnosticArea,
  GenerateAdventureEvalFixture,
} from "./generate-adventure-eval-types";

const VAGUE_DONE_PATTERNS = [
  "complete the task",
  "finish it",
  "get it done",
  "do the thing",
  "make progress",
  "work on it",
  "try your best",
];

const OBSERVABLE_DONE_TERMS = [
  "written",
  "listed",
  "chosen",
  "completed",
  "submitted",
  "published",
  "shared",
  "recorded",
  "captured",
  "measured",
  "scheduled",
  "practiced",
  "built",
  "tested",
  "reviewed",
  "served",
  "ready",
  "delivered",
  "drafted",
  "created",
  "one",
  "two",
  "three",
  "four",
  "first",
  "at least",
  "week",
  "weeks",
  "session",
  "sessions",
];

const FILLER_QUEST_PATTERNS = [
  "random quest",
  "do something",
  "do some stuff",
  "work on the goal",
  "advance the adventure",
  "continue your journey",
];

const FILLER_SIDE_QUEST_PATTERNS = [
  "optional fun",
  "random side quest",
  "do something extra",
  "explore the area",
  "collect coins",
  "grind for xp",
  "bonus task",
];

const GENERIC_BOSS_FIGHT_PATTERNS = [
  "hard task",
  "difficult task",
  "final task",
  "complete the task",
];

const RANDOM_LOOT_PATTERNS = [
  "magic sword",
  "dragon scale",
  "healing potion",
  "mana potion",
  "gold coins",
  "enchanted shield",
  "random loot",
];

const PRACTICAL_INVENTORY_TERMS = [
  "template",
  "checklist",
  "list",
  "calendar",
  "schedule",
  "tool",
  "resource",
  "notes",
  "plan",
  "workspace",
  "tracker",
  "equipment",
  "guide",
  "document",
  "repo",
  "starter",
  "sketch",
  "sketches",
  "sheet",
  "statement",
  "statements",
  "login",
  "card",
  "phrase",
  "phrases",
  "fallback",
  "partner",
  "partners",
  "app",
  "streak",
];

const CAPABILITY_TERMS = [
  "choose",
  "plan",
  "practice",
  "prepare",
  "build",
  "review",
  "measure",
  "write",
  "decide",
  "test",
  "communicate",
  "research",
  "organize",
  "learn",
  "track",
];

const DECORATIVE_SKILL_NAMES = [
  "strength",
  "dexterity",
  "agility",
  "charisma",
  "wisdom",
  "intelligence",
  "constitution",
  "luck",
  "power",
];

const UNLOCK_TERMS = ["complete", "after", "when", "once", "finish", "deliver", "publish"];
const GENERIC_NEXT_ACTION_PATTERNS = [
  "start working",
  "make progress",
  "do your best",
  "begin the journey",
  "keep going",
];

const GENERATED_ADVENTURE_QUALITY_AREAS: readonly AdventureQualityDiagnosticArea[] = [
  "required structure",
  "done condition",
  "quest quality",
  "side quest quality",
  "boss fight quality",
  "inventory quality",
  "skill quality",
  "achievement quality",
  "next action quality",
  "references",
  "progression balance",
  "fixture grounding",
  "safety",
];

const NON_AUTHORITATIVE_SAFETY_TERMS = [
  "professional",
  "expert",
  "educational",
  "not medical",
  "not financial",
  "not legal",
  "consult",
  "licensed",
  "structural",
];

export function checkGeneratedAdventureQuality(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
): AdventureQualityCheckResult {
  const diagnostics: AdventureQualityDiagnostic[] = [];

  checkRequiredStructure(adventure, diagnostics);
  checkActs(adventure, fixture, diagnostics);
  checkInventory(adventure, fixture, diagnostics);
  checkSkills(adventure, fixture, diagnostics);
  checkAchievements(adventure, fixture, diagnostics);
  checkFocusedNextActions(adventure, diagnostics);
  checkProgressionBalance(adventure, diagnostics);
  checkFixtureGrounding(adventure, fixture, diagnostics);
  checkHighStakesSafety(adventure, fixture, diagnostics);

  return {
    fixtureId: fixture.id,
    diagnostics,
    assertions: buildAdventureQualityAssertionOutcomes(GENERATED_ADVENTURE_QUALITY_AREAS, diagnostics),
  };
}

function checkRequiredStructure(
  adventure: GeneratedAdventure,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  addIfBlank(adventure.title, "required structure", "expected a non-empty Adventure title.", diagnostics);
  addIfBlank(
    adventure.themeSummary,
    "required structure",
    "expected a non-empty theme summary.",
    diagnostics,
  );
  addIfBlank(
    adventure.goalSummary,
    "required structure",
    "expected a non-empty goal summary.",
    diagnostics,
  );
  addIfEmpty(adventure.acts, "required structure", "expected at least one Act.", diagnostics);
  addIfEmpty(adventure.skills, "required structure", "expected at least one Skill.", diagnostics);
  addIfEmpty(
    adventure.inventoryItems,
    "required structure",
    "expected at least one Inventory Item.",
    diagnostics,
  );
  addIfEmpty(
    adventure.achievements,
    "required structure",
    "expected at least one Achievement.",
    diagnostics,
  );
  addIfEmpty(
    adventure.focusedNextActions,
    "required structure",
    "expected at least one focused next action.",
    diagnostics,
  );
}

function checkActs(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const skillKeys = new Set(adventure.skills.map((skill) => skill.key));
  const inventoryItemKeys = new Set(adventure.inventoryItems.map((item) => item.key));
  const contextTerms = buildContextTerms(fixture);

  for (const act of adventure.acts) {
    addIfEmpty(
      act.mainQuests,
      "required structure",
      `Act '${act.title}' expected at least one Main Quest.`,
      diagnostics,
    );
    addIfEmpty(
      act.sideQuests,
      "required structure",
      `Act '${act.title}' expected at least one Side Quest.`,
      diagnostics,
    );
    addIfEmpty(
      act.bossFights,
      "required structure",
      `Act '${act.title}' expected at least one Boss Fight.`,
      diagnostics,
    );

    for (const quest of act.mainQuests) {
      checkDoneCondition(quest.title, quest.doneCondition, diagnostics);
      checkMainQuest(quest, contextTerms, diagnostics);
      checkRewardsAndReferences(
        quest.title,
        quest.skillRewards,
        quest.inventoryItemKeys,
        skillKeys,
        inventoryItemKeys,
        diagnostics,
      );
    }

    for (const sideQuest of act.sideQuests) {
      checkDoneCondition(sideQuest.title, sideQuest.doneCondition, diagnostics);
      checkSideQuest(sideQuest, contextTerms, diagnostics);
      checkRewardsAndReferences(
        sideQuest.title,
        sideQuest.skillRewards,
        sideQuest.inventoryItemKeys,
        skillKeys,
        inventoryItemKeys,
        diagnostics,
      );
    }

    for (const bossFight of act.bossFights) {
      checkDoneCondition(bossFight.title, bossFight.doneCondition, diagnostics);
      checkBossFight(bossFight, diagnostics);
      checkRewardsAndReferences(
        bossFight.title,
        bossFight.skillRewards,
        bossFight.inventoryItemKeys,
        skillKeys,
        inventoryItemKeys,
        diagnostics,
      );
    }
  }
}

function checkDoneCondition(
  title: string,
  doneCondition: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(doneCondition);
  if (containsAny(text, VAGUE_DONE_PATTERNS) || isTooGenericDoneCondition(text)) {
    addDiagnostic(
      diagnostics,
      "done condition",
      `'${title}' needs an observable done condition rather than vague completion language.`,
    );
  }
}

function checkRewardsAndReferences(
  title: string,
  skillRewards: GeneratedAdventureSkillReward[],
  inventoryItemKeys: string[],
  skillKeys: ReadonlySet<string>,
  inventoryItemKeysByAdventure: ReadonlySet<string>,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (skillRewards.length === 0) {
    addDiagnostic(diagnostics, "references", `'${title}' expected at least one Skill XP reward.`);
  }

  if (inventoryItemKeys.length === 0) {
    addDiagnostic(diagnostics, "references", `'${title}' expected at least one relevant Inventory Item link.`);
  }

  const seenRewardSkillKeys = new Set<string>();
  for (const reward of skillRewards) {
    if (seenRewardSkillKeys.has(reward.skillKey)) {
      addDiagnostic(diagnostics, "references", `'${title}' has duplicate XP for Skill '${reward.skillKey}'.`);
    }
    seenRewardSkillKeys.add(reward.skillKey);

    if (!skillKeys.has(reward.skillKey)) {
      addDiagnostic(diagnostics, "references", `'${title}' references unknown Skill '${reward.skillKey}'.`);
    }

    if (
      !Number.isInteger(reward.xp) ||
      reward.xp < MIN_GENERATED_ADVENTURE_REWARD_XP ||
      reward.xp > MAX_GENERATED_ADVENTURE_REWARD_XP
    ) {
      addDiagnostic(
        diagnostics,
        "references",
        `'${title}'.${reward.skillKey} XP must be an integer from ${MIN_GENERATED_ADVENTURE_REWARD_XP} to ${MAX_GENERATED_ADVENTURE_REWARD_XP}.`,
      );
    }
  }

  const seenInventoryItemKeys = new Set<string>();
  for (const inventoryItemKey of inventoryItemKeys) {
    if (seenInventoryItemKeys.has(inventoryItemKey)) {
      addDiagnostic(diagnostics, "references", `'${title}' has duplicate Inventory Item link '${inventoryItemKey}'.`);
    }
    seenInventoryItemKeys.add(inventoryItemKey);

    if (!inventoryItemKeysByAdventure.has(inventoryItemKey)) {
      addDiagnostic(
        diagnostics,
        "references",
        `'${title}' references unknown Inventory Item '${inventoryItemKey}'.`,
      );
    }
  }
}

function checkMainQuest(
  quest: GeneratedAdventureQuest,
  contextTerms: string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${quest.title} ${quest.description} ${quest.doneCondition} ${quest.rewardIntent}`);

  if (containsAny(text, FILLER_QUEST_PATTERNS)) {
    addDiagnostic(
      diagnostics,
      "quest quality",
      `'${quest.title}' looks generic instead of a concrete goal-connected Main Quest.`,
    );
    return;
  }

  if (!hasAnyWord(text, contextTerms)) {
    addDiagnostic(
      diagnostics,
      "quest quality",
      `'${quest.title}' should mention the user's goal, constraints, resources, or context.`,
    );
  }
}

function checkSideQuest(
  sideQuest: GeneratedAdventureQuest,
  contextTerms: string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${sideQuest.title} ${sideQuest.description} ${sideQuest.doneCondition} ${sideQuest.rewardIntent}`);

  if (containsAny(text, FILLER_SIDE_QUEST_PATTERNS)) {
    addDiagnostic(
      diagnostics,
      "side quest quality",
      `'${sideQuest.title}' looks like filler instead of a goal-connected Side Quest.`,
    );
    return;
  }

  if (!hasAnyWord(text, contextTerms)) {
    addDiagnostic(
      diagnostics,
      "side quest quality",
      `'${sideQuest.title}' should mention the user's goal, constraints, resources, or context.`,
    );
  }
}

function checkBossFight(
  bossFight: GeneratedAdventureBossFight, diagnostics: AdventureQualityDiagnostic[]): void {
  const text = normalize(`${bossFight.title} ${bossFight.description} ${bossFight.doneCondition}`);

  if (containsAny(text, GENERIC_BOSS_FIGHT_PATTERNS) || !containsAny(text, OBSERVABLE_DONE_TERMS)) {
    addDiagnostic(
      diagnostics,
      "boss fight quality",
      `'${bossFight.title}' should read like an observable milestone, proof point, or challenge.`,
    );
  }
}

function checkInventory(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const item of adventure.inventoryItems) {
    const text = normalize(`${item.name} ${item.purpose}`);

    if (containsAny(text, RANDOM_LOOT_PATTERNS)) {
      addDiagnostic(
        diagnostics,
        "inventory quality",
        `'${item.name}' looks like random fantasy loot instead of practical readiness.`,
      );
      continue;
    }

    if (!containsAny(text, [...PRACTICAL_INVENTORY_TERMS, ...fixture.expectations.expectedInventoryThemes])) {
      addDiagnostic(
        diagnostics,
        "inventory quality",
        `'${item.name}' should describe a practical readiness item.`,
      );
    }
  }
}

function checkSkills(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const skill of adventure.skills) {
    const name = normalize(skill.name);

    if (DECORATIVE_SKILL_NAMES.includes(name)) {
      addDiagnostic(
        diagnostics,
        "skill quality",
        `'${skill.name}' should represent a real capability, not a decorative stat.`,
      );
    }
  }

  const allSkillText = normalize(
    adventure.skills.map((skill) => `${skill.name} ${skill.description}`).join(" "),
  );

  if (!containsAny(allSkillText, CAPABILITY_TERMS)) {
    addDiagnostic(diagnostics, "skill quality", "expected Skills to describe real capabilities.");
  }
  const adventureText = normalize(JSON.stringify(adventure));
  for (const expectedTheme of fixture.expectations.expectedSkillThemes) {
    if (!allSkillText.includes(normalize(expectedTheme)) && !adventureText.includes(normalize(expectedTheme))) {
      addDiagnostic(
        diagnostics,
        "fixture grounding",
        `expected generated Skills to mention '${expectedTheme}'.`,
      );
    }
  }
}

function checkAchievements(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const contextTerms = buildContextTerms(fixture);
  for (const achievement of adventure.achievements) {
    const unlockCondition = normalize(achievement.unlockCondition);

    if (
      containsAny(unlockCondition, VAGUE_DONE_PATTERNS) ||
      !containsAny(unlockCondition, UNLOCK_TERMS)
    ) {
      addDiagnostic(
        diagnostics,
        "achievement quality",
        `'${achievement.name}' needs a concrete unlock condition.`,
      );
      continue;
    }

    const achievementText = normalize(`${achievement.name} ${achievement.description} ${achievement.unlockCondition}`);
    if (!hasAnyWord(achievementText, contextTerms)) {
      addDiagnostic(
        diagnostics,
        "achievement quality",
        `'${achievement.name}' should connect to the user's goal or generated progression.`,
      );
    }
  }
}

function checkFocusedNextActions(
  adventure: GeneratedAdventure,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const action of adventure.focusedNextActions) {
    const text = normalize(`${action.title} ${action.description}`);

    if (containsAny(text, GENERIC_NEXT_ACTION_PATTERNS)) {
      addDiagnostic(
        diagnostics,
        "next action quality",
        `'${action.title}' should be a small, concrete next action.`,
      );
    }
  }
}


function checkProgressionBalance(
  adventure: GeneratedAdventure,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const allRows = adventure.acts.flatMap((act) => [...act.mainQuests, ...act.sideQuests, ...act.bossFights]);
  const rewardedSkillKeys = new Set(allRows.flatMap((row) => row.skillRewards.map((reward) => reward.skillKey)));
  const referencedInventoryItemKeys = new Set(allRows.flatMap((row) => row.inventoryItemKeys));

  for (const skill of adventure.skills) {
    if (!rewardedSkillKeys.has(skill.key)) {
      addDiagnostic(
        diagnostics,
        "progression balance",
        `Skill '${skill.name}' is never rewarded by any Quest or Boss Fight.`,
      );
    }
  }

  for (const item of adventure.inventoryItems) {
    if (!referencedInventoryItemKeys.has(item.key)) {
      addDiagnostic(
        diagnostics,
        "progression balance",
        `Inventory Item '${item.name}' is never used by any Quest or Boss Fight.`,
      );
    }
  }

  const questRewardTotals = adventure.acts.flatMap((act) =>
    [...act.mainQuests, ...act.sideQuests].map((quest) => ({
      key: quest.key,
      xp: sumRewards(quest.skillRewards),
    })),
  );
  const bossFightRewardTotals = adventure.acts.flatMap((act) =>
    act.bossFights.map((bossFight) => ({
      key: bossFight.key,
      xp: sumRewards(bossFight.skillRewards),
    })),
  );
  const maxQuestXp = Math.max(0, ...questRewardTotals.map((entry) => entry.xp));
  const maxBossFightXp = Math.max(0, ...bossFightRewardTotals.map((entry) => entry.xp));

  if (maxQuestXp > 0 && maxBossFightXp > 0 && maxBossFightXp < maxQuestXp) {
    addDiagnostic(
      diagnostics,
      "progression balance",
      "expected at least one Boss Fight reward total to be as high as the strongest Quest reward total.",
    );
  }

  for (const act of adventure.acts) {
    const maxActQuestXp = Math.max(
      0,
      ...[...act.mainQuests, ...act.sideQuests].map((quest) => sumRewards(quest.skillRewards)),
    );
    const maxActBossFightXp = Math.max(0, ...act.bossFights.map((bossFight) => sumRewards(bossFight.skillRewards)));

    if (maxActQuestXp > 0 && maxActBossFightXp > 0 && maxActBossFightXp < maxActQuestXp) {
      addDiagnostic(
        diagnostics,
        "progression balance",
        `Act '${act.title}' expected a Boss Fight reward total at least as high as its strongest Quest reward total.`,
      );
    }
  }
}

function sumRewards(rewards: readonly GeneratedAdventureSkillReward[]): number {
  return rewards.reduce((total, reward) => total + reward.xp, 0);
}

function checkFixtureGrounding(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const adventureText = normalize(JSON.stringify(adventure));

  for (const expectedTerm of fixture.expectations.expectedGoalTerms) {
    if (!adventureText.includes(normalize(expectedTerm))) {
      addDiagnostic(
        diagnostics,
        "fixture grounding",
        `expected generated Adventure to mention '${expectedTerm}'.`,
      );
    }
  }

  const inventoryText = normalize(
    adventure.inventoryItems.map((item) => `${item.name} ${item.purpose}`).join(" "),
  );
  for (const expectedTheme of fixture.expectations.expectedInventoryThemes) {
    if (!inventoryText.includes(normalize(expectedTheme))) {
      addDiagnostic(
        diagnostics,
        "fixture grounding",
        `expected generated Inventory to mention '${expectedTheme}'.`,
      );
    }
  }
}

function checkHighStakesSafety(
  adventure: GeneratedAdventure,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const adventureText = normalize(JSON.stringify(adventure));

  if (!fixture.expectations.highStakesSafety) {
    return;
  }

  const safetyText = normalize(adventure.safetyNotes.join(" "));
  if (!containsAny(safetyText, NON_AUTHORITATIVE_SAFETY_TERMS)) {
    addDiagnostic(diagnostics, "safety", "missing non-authoritative safety note.");
  }

  for (const forbiddenPattern of fixture.expectations.forbiddenAdvicePatterns) {
    if (adventureText.includes(normalize(forbiddenPattern))) {
      addDiagnostic(
        diagnostics,
        "safety",
        `contains forbidden high-stakes advice pattern '${forbiddenPattern}'.`,
      );
    }
  }
}

function buildContextTerms(fixture: GenerateAdventureEvalFixture): string[] {
  return unique([
    ...fixture.expectations.expectedGoalTerms,
    ...fixture.expectations.expectedSkillThemes,
    ...fixture.expectations.expectedInventoryThemes,
    ...extractSignificantWords(fixture.goalText),
    ...extractSignificantWords(fixture.interviewOutputArtifact.goalSummary),
    ...extractSignificantWords(fixture.interviewOutputArtifact.currentStage),
    ...fixture.interviewOutputArtifact.blockers.flatMap(extractSignificantWords),
    ...fixture.interviewOutputArtifact.constraints.flatMap(extractSignificantWords),
    ...fixture.interviewOutputArtifact.existingResources.flatMap(extractSignificantWords),
    ...fixture.interviewOutputArtifact.likelyMissingResources.flatMap(extractSignificantWords),
    ...fixture.interviewOutputArtifact.preferences.flatMap(extractSignificantWords),
    ...extractSignificantWords(fixture.interviewOutputArtifact.compactSourceSummary),
  ]);
}

function extractSignificantWords(text: string): string[] {
  const stopWords = new Set([
    "about",
    "after",
    "before",
    "become",
    "with",
    "without",
    "from",
    "that",
    "this",
    "their",
    "there",
    "want",
    "need",
    "goal",
    "into",
  ]);

  return normalize(text)
    .split(/[^a-z0-9]+/u)
    .filter((word) => word.length >= 4 && !stopWords.has(word));
}

function addIfBlank(
  value: string,
  area: AdventureQualityDiagnosticArea,
  message: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (value.trim().length === 0) {
    addDiagnostic(diagnostics, area, message);
  }
}

function addIfEmpty(
  value: readonly unknown[],
  area: AdventureQualityDiagnosticArea,
  message: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (value.length === 0) {
    addDiagnostic(diagnostics, area, message);
  }
}

function addDiagnostic(
  diagnostics: AdventureQualityDiagnostic[],
  area: AdventureQualityDiagnosticArea,
  message: string,
): void {
  diagnostics.push({ area, message });
}

function containsAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(normalize(pattern)));
}

function isTooGenericDoneCondition(text: string): boolean {
  if (containsAny(text, OBSERVABLE_DONE_TERMS)) {
    return false;
  }

  const words = text.split(/[^a-z0-9]+/u).filter(Boolean);
  return words.length < 5;
}

function hasAnyWord(text: string, words: readonly string[]): boolean {
  const textWords = new Set(text.split(/[^a-z0-9]+/u).filter(Boolean));
  return words.some((word) => textWords.has(normalize(word)));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/gu, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(normalize).filter((value) => value.length > 0))];
}
