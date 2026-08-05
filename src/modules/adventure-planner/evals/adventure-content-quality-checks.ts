import type {
  GeneratedAdventureContent,
  GeneratedAdventureContentBossFight,
  GeneratedAdventureContentQuest,
} from "../domain/generated-adventure-content";
import lemmatize from "wink-lemmatizer";
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
  "shows",
  "confirmation",
  "confirmed",
  "recording",
  "note",
  "notes",
  "reflection",
  "transcript",
  "witness",
  "logged",
  "log",
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
const PRACTICAL_INVENTORY_ARTIFACT_TERMS = [
  "template",
  "checklist",
  "list",
  "calendar",
  "schedule",
  "tool",
  "resource",
  "notes",
  "note",
  "plan",
  "tracker",
  "equipment",
  "guide",
  "document",
  "workspace",
  "sheet",
  "card",
  "phrase",
  "phrases",
  "app",
  "log",
  "folder",
  "recording",
  "recordings",
  "bank",
  "worksheet",
  "journal",
  "rubric",
  "script",
  "timer",
];
const PRACTICAL_INVENTORY_ACTION_TERMS = [
  "use",
  "record",
  "review",
  "track",
  "log",
  "write",
  "schedule",
  "store",
  "capture",
  "organize",
  "prepare",
  "practice",
  "reference",
  "reserve",
  "block",
];
const PEOPLE_AS_INVENTORY_TERMS = [
  "coworker",
  "coworkers",
  "co-worker",
  "co-workers",
  "friend",
  "friends",
  "partner",
  "partners",
  "mentor",
  "mentors",
  "teacher",
  "teachers",
  "coach",
  "coaches",
  "tutor",
  "tutors",
  "neighbor",
  "neighbors",
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
const GENERIC_NEXT_ACTION_PATTERNS = ["start working", "make progress", "do your best", "begin the journey", "keep going"];
const QUEST_STEP_ACTION_TERMS = [
  "add",
  "ask",
  "build",
  "capture",
  "check",
  "choose",
  "circle",
  "collect",
  "compare",
  "confirm",
  "create",
  "decide",
  "define",
  "draft",
  "draw",
  "gather",
  "highlight",
  "identify",
  "install",
  "keep",
  "leave",
  "list",
  "log",
  "make",
  "map",
  "mark",
  "measure",
  "note",
  "open",
  "organize",
  "place",
  "play",
  "pick",
  "plan",
  "practice",
  "prepare",
  "put",
  "pull",
  "record",
  "recruit",
  "review",
  "save",
  "say",
  "schedule",
  "select",
  "set",
  "share",
  "store",
  "test",
  "update",
  "use",
  "walk",
  "write",
];
const NON_ACTION_QUEST_STEP_OPENING_TERMS = [
  "admire",
  "appreciate",
  "contemplate",
  "enjoy",
  "imagine",
  "think",
  "wonder",
];
const QUEST_STEP_OBJECT_MARKERS = [
  "a",
  "an",
  "any",
  "each",
  "every",
  "one",
  "the",
  "this",
  "that",
  "these",
  "those",
  "three",
  "two",
  "your",
];
const GENERIC_QUEST_STEP_PATTERNS = [
  "complete the step",
  "continue working",
  "do the task",
  "do this step",
  "keep going",
  "make progress",
  "start working",
  "take action",
  "work on it",
  "work on the quest",
];
const ADVENTURE_CONTENT_QUALITY_AREAS: readonly AdventureQualityDiagnosticArea[] = [
  "required structure",
  "done condition",
  "quest quality",
  "side quest quality",
  "boss fight quality",
  "quest step quality",
  "skill quality",
  "inventory quality",
  "achievement quality",
  "next action quality",
  "fixture grounding",
  "safety",
  "references",
];

const NON_AUTHORITATIVE_SAFETY_TERMS = ["professional", "expert", "educational", "not medical", "not financial", "not legal", "consult", "licensed", "structural"];

export function checkGeneratedAdventureContentQuality(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
): AdventureQualityCheckResult {
  const diagnostics: AdventureQualityDiagnostic[] = [];

  checkRequiredStructure(content, diagnostics);
  checkActs(content, fixture, diagnostics);
  checkSkills(content, fixture, diagnostics);
  checkInventory(content, fixture, diagnostics);
  checkAchievements(content, diagnostics);
  checkFocusedNextActions(content, diagnostics);
  checkFixtureGrounding(content, fixture, diagnostics);
  checkHighStakesSafety(content, fixture, diagnostics);
  checkNoDependencyOrXpFields(content, diagnostics);

  return {
    fixtureId: fixture.id,
    diagnostics,
    assertions: buildAdventureQualityAssertionOutcomes(ADVENTURE_CONTENT_QUALITY_AREAS, diagnostics),
  };
}

function checkRequiredStructure(
  content: GeneratedAdventureContent,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  addIfBlank(content.title, "required structure", "expected a non-empty Adventure title.", diagnostics);
  addIfBlank(content.themeSummary, "required structure", "expected a non-empty theme summary.", diagnostics);
  addIfBlank(content.goalSummary, "required structure", "expected a non-empty goal summary.", diagnostics);
  addIfEmpty(content.acts, "required structure", "expected at least one Act.", diagnostics);
  addIfEmpty(content.skills, "required structure", "expected at least one Skill.", diagnostics);
  addIfEmpty(content.inventoryItems, "required structure", "expected at least one Inventory Item.", diagnostics);
  addIfEmpty(content.achievements, "required structure", "expected at least one Achievement.", diagnostics);
  addIfEmpty(content.focusedNextActions, "required structure", "expected at least one focused next action.", diagnostics);
}

function checkActs(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const contextTerms = buildContextTerms(fixture);

  for (const act of content.acts) {
    addIfEmpty(act.mainQuests, "required structure", `Act ${act.key} expected at least one Main Quest.`, diagnostics);
    addIfEmpty(act.sideQuests, "required structure", `Act ${act.key} expected at least one Side Quest.`, diagnostics);
    addIfEmpty(act.bossFights, "required structure", `Act ${act.key} expected at least one Boss Fight.`, diagnostics);

    for (const quest of act.mainQuests) {
      checkDoneCondition(quest, diagnostics);
      checkMainQuestQuality(quest, contextTerms, diagnostics);
      checkQuestStepQuality(quest, contextTerms, diagnostics);
    }

    for (const sideQuest of act.sideQuests) {
      checkDoneCondition(sideQuest, diagnostics);
      checkSideQuestQuality(sideQuest, contextTerms, diagnostics);
      checkQuestStepQuality(sideQuest, contextTerms, diagnostics);
    }

    for (const bossFight of act.bossFights) {
      checkDoneCondition(bossFight, diagnostics);
      checkBossFightQuality(bossFight, diagnostics);
      checkBossFightExcludesQuestSteps(bossFight, diagnostics);
    }
  }
}

function checkDoneCondition(
  step: GeneratedAdventureContentQuest | GeneratedAdventureContentBossFight,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(step.doneCondition);

  if (includesAny(text, VAGUE_DONE_PATTERNS) || isTooGenericDoneCondition(text)) {
    diagnostics.push({
      area: "done condition",
      message: `${step.key} needs an observable done condition rather than vague completion language.`,
    });
  }
}

function checkMainQuestQuality(
  quest: GeneratedAdventureContentQuest,
  contextTerms: readonly string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${quest.title} ${quest.description} ${quest.doneCondition} ${quest.rewardIntent}`);

  if (includesAny(text, FILLER_QUEST_PATTERNS)) {
    diagnostics.push({
      area: "quest quality",
      message: `${quest.key} looks generic instead of a concrete goal-connected Main Quest.`,
    });
    return;
  }

  if (!hasAnyWord(text, contextTerms)) {
    diagnostics.push({
      area: "quest quality",
      message: `${quest.key} should mention the user's goal, constraints, resources, or context.`,
    });
  }
}

function checkSideQuestQuality(
  sideQuest: GeneratedAdventureContentQuest,
  contextTerms: readonly string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${sideQuest.title} ${sideQuest.description} ${sideQuest.doneCondition} ${sideQuest.rewardIntent}`);

  if (includesAny(text, FILLER_SIDE_QUEST_PATTERNS)) {
    diagnostics.push({
      area: "side quest quality",
      message: `${sideQuest.key} looks like filler instead of a goal-connected Side Quest.`,
    });
    return;
  }

  if (!hasAnyWord(text, contextTerms)) {
    diagnostics.push({
      area: "side quest quality",
      message: `${sideQuest.key} should mention the user's goal, constraints, resources, or context.`,
    });
  }
}

function checkQuestStepQuality(
  quest: GeneratedAdventureContentQuest,
  contextTerms: readonly string[],
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const steps = quest.steps;
  const questContext = normalize(`${quest.title} ${quest.description} ${quest.doneCondition} ${quest.rewardIntent}`);
  const questTerms = extractSignificantWords(questContext);

  if (!Array.isArray(steps) || steps.length === 0) {
    diagnostics.push({
      area: "quest step quality",
      message: `${quest.key} must include 2–7 concrete Quest Steps.`,
    });
    return;
  }

  if (steps.length < 2 || steps.length > 7) {
    diagnostics.push({
      area: "quest step quality",
      message: `${quest.key} has ${steps.length} Quest Steps; expected 2–7, with 3–5 preferred.`,
    });
  }

  const normalizedDescriptions = steps.map((step) => normalize(step.description));
  const seenDescriptions = new Set<string>();

  steps.forEach((step, index) => {
    const description = normalizedDescriptions[index] ?? "";
    const stepLabel = `${quest.key}.steps[${index}]`;

    if (description.length === 0) {
      diagnostics.push({
        area: "quest step quality",
        message: `${stepLabel} must have a non-empty action description.`,
      });
      return;
    }

    if (isGenericQuestStepDescription(description)) {
      diagnostics.push({
        area: "quest step quality",
        message: `${stepLabel} is generic filler instead of quest-specific guidance.`,
      });
    }

    if (!hasConcreteQuestStepAction(description)) {
      diagnostics.push({
        area: "quest step quality",
        message: `${stepLabel} should start from a concrete user action, decision, check, or artifact.`,
      });
    }

    if (!hasAnyWord(description, [...questTerms, ...contextTerms])) {
      diagnostics.push({
        area: "quest step quality",
        message: `${stepLabel} should connect to the Quest or fixture context.`,
      });
    }

    const comparableDescription = stripGenericStepWords(description);
    if (seenDescriptions.has(comparableDescription)) {
      diagnostics.push({
        area: "quest step quality",
        message: `${stepLabel} repeats another Quest Step instead of adding distinct guidance.`,
      });
    }
    seenDescriptions.add(comparableDescription);
  });
}

function checkBossFightExcludesQuestSteps(
  bossFight: GeneratedAdventureContentBossFight,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if ("steps" in (bossFight as Record<string, unknown>)) {
    diagnostics.push({
      area: "quest step quality",
      message: `${bossFight.key} is a Boss Fight and must not include Quest Steps.`,
    });
  }
}

function checkBossFightQuality(
  bossFight: GeneratedAdventureContentBossFight,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const text = normalize(`${bossFight.title} ${bossFight.description} ${bossFight.doneCondition} ${bossFight.rewardIntent}`);

  if (includesAny(text, GENERIC_BOSS_FIGHT_PATTERNS) || !includesAny(text, OBSERVABLE_DONE_TERMS)) {
    diagnostics.push({
      area: "boss fight quality",
      message: `${bossFight.key} should read like an observable milestone, proof point, or challenge.`,
    });
  }
}

function checkSkills(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const searchable = normalize(content.skills.map((skill) => `${skill.name} ${skill.description}`).join(" "));

  if (!includesAny(searchable, CAPABILITY_TERMS)) {
    diagnostics.push({ area: "skill quality", message: "expected Skills to describe real capabilities." });
  }

  void fixture;
}

function checkInventory(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const item of content.inventoryItems) {
    const text = normalize(`${item.name} ${item.purpose}`);

    if (includesAny(text, RANDOM_LOOT_PATTERNS)) {
      diagnostics.push({
        area: "inventory quality",
        message: `'${item.name}' looks like random fantasy loot instead of practical readiness.`,
      });
      continue;
    }

    if (looksLikePeopleAsInventory(item.name)) {
      diagnostics.push({
        area: "inventory quality",
        message: `'${item.name}' should be a user-controlled artifact, tool, or routine, not a person or group.`,
      });
      continue;
    }

    if (!isPracticalInventoryText(text, fixture.expectations.expectedInventoryThemes)) {
      diagnostics.push({
        area: "inventory quality",
        message: `'${item.name}' should describe a practical readiness item.`,
      });
    }
  }
}

function looksLikePeopleAsInventory(itemName: string): boolean {
  const name = normalize(itemName);

  return (
    includesAny(name, PEOPLE_AS_INVENTORY_TERMS) &&
    !includesAny(name, PRACTICAL_INVENTORY_ARTIFACT_TERMS)
  );
}

function isPracticalInventoryText(text: string, expectedInventoryThemes: readonly string[]): boolean {
  return (
    includesAny(text, PRACTICAL_INVENTORY_ARTIFACT_TERMS) ||
    includesAny(text, PRACTICAL_INVENTORY_ACTION_TERMS) ||
    includesAny(text, expectedInventoryThemes)
  );
}

function checkAchievements(
  content: GeneratedAdventureContent,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const achievement of content.achievements) {
    const searchable = normalize(achievement.unlockCondition);
    if (includesAny(searchable, VAGUE_DONE_PATTERNS)) {
      diagnostics.push({
        area: "achievement quality",
        message: `${achievement.key} has a vague unlock condition.`,
      });
    }
  }
}

function checkFocusedNextActions(
  content: GeneratedAdventureContent,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const action of content.focusedNextActions) {
    const searchable = normalize(`${action.title} ${action.description}`);
    if (includesAny(searchable, GENERIC_NEXT_ACTION_PATTERNS)) {
      diagnostics.push({ area: "next action quality", message: `${action.title} is too generic for a focused next action.` });
    }
  }
}

function checkFixtureGrounding(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const searchable = normalize(JSON.stringify(content));

  for (const term of fixture.expectations.expectedGoalTerms) {
    if (!searchable.includes(normalize(term))) {
      diagnostics.push({ area: "fixture grounding", message: `expected generated content to mention ${term}.` });
    }
  }
}

function checkHighStakesSafety(
  content: GeneratedAdventureContent,
  fixture: GenerateAdventureEvalFixture,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const searchable = normalize(`${content.safetyNotes.join(" ")} ${JSON.stringify(content)}`);

  if (fixture.expectations.highStakesSafety && !includesAny(searchable, NON_AUTHORITATIVE_SAFETY_TERMS)) {
    diagnostics.push({ area: "safety", message: "expected non-authoritative high-stakes safety language." });
  }

  for (const pattern of fixture.expectations.forbiddenAdvicePatterns) {
    if (searchable.includes(normalize(pattern))) {
      diagnostics.push({ area: "safety", message: `generated content included forbidden advice pattern: ${pattern}.` });
    }
  }
}

function checkNoDependencyOrXpFields(
  content: GeneratedAdventureContent,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  const rawContent = content as unknown as { acts?: Array<{ mainQuests?: unknown[]; sideQuests?: unknown[]; bossFights?: unknown[] }> };

  for (const item of rawContent.acts?.flatMap((act) => [
    ...(act.mainQuests ?? []),
    ...(act.sideQuests ?? []),
    ...(act.bossFights ?? []),
  ]) ?? []) {
    if (typeof item === "object" && item !== null) {
      const record = item as Record<string, unknown>;
      const forbidden = ["skillRewards", "inventoryItemKeys", "skillKeys", "xp"].filter((field) => field in record);
      if (forbidden.length > 0) {
        diagnostics.push({
          area: "references",
          message: `content step should not include dependency or XP fields: ${forbidden.join(", ")}.`,
        });
      }
    }
  }
}

function stripGenericStepWords(text: string): string {
  return text
    .replace(/\b(step|task|quest|work|thing|action|first|next|then|finally)\b/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function hasConcreteQuestStepAction(description: string): boolean {
  if (hasAnyWord(description, QUEST_STEP_ACTION_TERMS)) {
    return true;
  }

  return hasPlausibleImperativeOpening(description);
}

function isGenericQuestStepDescription(description: string): boolean {
  const strippedDescription = stripGenericStepWords(description);

  return GENERIC_QUEST_STEP_PATTERNS.some((pattern) => {
    const normalizedPattern = normalize(pattern);
    return (
      description === normalizedPattern ||
      description.startsWith(`${normalizedPattern} `) ||
      strippedDescription === stripGenericStepWords(normalizedPattern)
    );
  });
}

function hasPlausibleImperativeOpening(description: string): boolean {
  const words = description.split(/[^a-z0-9]+/u).filter(Boolean);
  const firstWord = words[0];

  if (!firstWord || NON_ACTION_QUEST_STEP_OPENING_TERMS.includes(firstWord) || words.length < 5) {
    return false;
  }

  return words.slice(1, 5).some((word) => QUEST_STEP_OBJECT_MARKERS.includes(word));
}

function buildContextTerms(fixture: GenerateAdventureEvalFixture): string[] {
  return unique([
    ...fixture.expectations.expectedGoalTerms,
    ...fixture.expectations.expectedSkillThemes,
    ...fixture.expectations.expectedInventoryThemes,
    ...extractSignificantWords(fixture.goalText),
    ...extractSignificantWords(fixture.interviewOutputArtifact.goalSummary),
    ...extractSignificantWords(fixture.interviewOutputArtifact.coreWhy),
    ...extractSignificantWords(fixture.interviewOutputArtifact.successDefinition),
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
  area: AdventureQualityDiagnostic["area"],
  message: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (value.trim().length === 0) {
    diagnostics.push({ area, message });
  }
}

function addIfEmpty(
  value: unknown[],
  area: AdventureQualityDiagnostic["area"],
  message: string,
  diagnostics: AdventureQualityDiagnostic[],
): void {
  if (value.length === 0) {
    diagnostics.push({ area, message });
  }
}

function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(normalize(term)));
}

function isTooGenericDoneCondition(text: string): boolean {
  if (includesAny(text, OBSERVABLE_DONE_TERMS)) {
    return false;
  }

  const words = text.split(/[^a-z0-9]+/u).filter(Boolean);
  return words.length < 5;
}

function hasAnyWord(text: string, words: readonly string[]): boolean {
  const textWords = new Set(text.split(/[^a-z0-9]+/u).filter(Boolean).flatMap(wordVariants));
  return words.some((word) => wordVariants(normalize(word)).some((variant) => textWords.has(variant)));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}

function wordVariants(word: string): string[] {
  const variants = new Set([word]);
  variants.add(lemmatize.verb(word));
  variants.add(lemmatize.noun(word));

  if (word.length > 4 && word.endsWith("s")) {
    variants.add(word.slice(0, -1));
  }

  if (word.length > 5 && word.endsWith("ing")) {
    variants.add(trimDoubledConsonant(word.slice(0, -3)));
  }

  if (word.length > 4 && word.endsWith("ed")) {
    const baseWord = trimDoubledConsonant(word.slice(0, -2));
    variants.add(baseWord);
    variants.add(`${baseWord}e`);
  }

  if (word === "froze" || word === "frozen") {
    variants.add("freeze");
  }

  if (word === "freezing") {
    variants.add("freeze");
  }

  return [...variants];
}

function trimDoubledConsonant(word: string): string {
  const lastLetter = word.at(-1);
  const previousLetter = word.at(-2);

  if (lastLetter && lastLetter === previousLetter && !["a", "e", "i", "o", "u"].includes(lastLetter)) {
    return word.slice(0, -1);
  }

  return word;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(normalize).filter((value) => value.length > 0))];
}
