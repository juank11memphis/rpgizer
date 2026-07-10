import type {
  GeneratedAdventure,
  GeneratedAdventureBossFight,
  GeneratedAdventureQuest,
  GeneratedAdventureSkillReward,
} from "../domain/generated-adventure";
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
  "first",
  "at least",
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

const BOSS_FIGHT_TERMS = [
  "prove",
  "proof",
  "milestone",
  "challenge",
  "test",
  "pressure",
  "demo",
  "launch",
  "deliver",
  "complete",
  "final",
  "boss",
  "trial",
  "simulation",
  "beta",
  "defeat",
  "boundary",
  "oath",
  "commitment",
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
  "improve",
  "track",
  "reduce",
  "modify",
  "gather",
  "prioritize",
];

const UNLOCK_TERMS = ["complete", "after", "when", "once", "finish", "deliver", "publish"];
const NEXT_ACTION_VERBS = [
  "choose",
  "write",
  "list",
  "schedule",
  "draft",
  "ask",
  "build",
  "practice",
  "review",
  "pick",
  "set",
  "create",
  "pull",
  "gather",
  "open",
  "prepare",
];

const GENERIC_NEXT_ACTION_PATTERNS = [
  "start working",
  "make progress",
  "do your best",
  "begin the journey",
  "keep going",
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
  checkAchievements(adventure, diagnostics);
  checkFocusedNextActions(adventure, diagnostics);
  checkFixtureGrounding(adventure, fixture, diagnostics);
  checkHighStakesSafety(adventure, fixture, diagnostics);

  return { fixtureId: fixture.id, diagnostics };
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

    for (const quest of [...act.mainQuests, ...act.sideQuests]) {
      checkDoneCondition(quest.title, quest.doneCondition, diagnostics);
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
      checkSideQuest(sideQuest, contextTerms, diagnostics);
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
  if (containsAny(text, VAGUE_DONE_PATTERNS) || !containsAny(text, OBSERVABLE_DONE_TERMS)) {
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
  for (const reward of skillRewards) {
    if (!skillKeys.has(reward.skillKey)) {
      addDiagnostic(diagnostics, "references", `'${title}' references unknown Skill '${reward.skillKey}'.`);
    }

    if (!Number.isFinite(reward.xp) || reward.xp <= 0) {
      addDiagnostic(diagnostics, "references", `'${title}' must award positive Skill XP.`);
    }
  }

  for (const inventoryItemKey of inventoryItemKeys) {
    if (!inventoryItemKeysByAdventure.has(inventoryItemKey)) {
      addDiagnostic(
        diagnostics,
        "references",
        `'${title}' references unknown Inventory Item '${inventoryItemKey}'.`,
      );
    }
  }
}

function checkSideQuest(
  sideQuest: GeneratedAdventureQuest,
  contextTerms: string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${sideQuest.title} ${sideQuest.description} ${sideQuest.doneCondition}`);

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
      `'${sideQuest.title}' should mention the user's goal or context.`,
    );
  }
}

function checkBossFight(
  bossFight: GeneratedAdventureBossFight, diagnostics: AdventureQualityDiagnostic[]): void {
  const text = normalize(`${bossFight.title} ${bossFight.description} ${bossFight.doneCondition}`);

  if (!containsAny(text, BOSS_FIGHT_TERMS)) {
    addDiagnostic(
      diagnostics,
      "boss fight quality",
      `'${bossFight.title}' should read like a milestone, proof point, or challenge.`,
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
    const text = normalize(`${skill.name} ${skill.description}`);

    if (DECORATIVE_SKILL_NAMES.includes(name) || !containsAny(text, CAPABILITY_TERMS)) {
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
  for (const expectedTheme of fixture.expectations.expectedSkillThemes) {
    if (!allSkillText.includes(normalize(expectedTheme))) {
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
  diagnostics: AdventureQualityDiagnostic[],
): void {
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
    }
  }
}

function checkFocusedNextActions(
  adventure: GeneratedAdventure,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const action of adventure.focusedNextActions) {
    const text = normalize(`${action.title} ${action.description}`);

    if (containsAny(text, GENERIC_NEXT_ACTION_PATTERNS) || !containsAny(text, NEXT_ACTION_VERBS)) {
      addDiagnostic(
        diagnostics,
        "next action quality",
        `'${action.title}' should be a small, concrete next action.`,
      );
    }
  }
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
