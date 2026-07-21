import type { GeneratedAdventureContent } from "../domain/generated-adventure-content";
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
  "tracker",
  "equipment",
  "guide",
  "document",
  "workspace",
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
const ADVENTURE_CONTENT_QUALITY_AREAS: readonly AdventureQualityDiagnosticArea[] = [
  "required structure",
  "done condition",
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
  checkActs(content, diagnostics);
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
  diagnostics: AdventureQualityDiagnostic[],
): void {
  for (const act of content.acts) {
    addIfEmpty(act.mainQuests, "required structure", `Act ${act.key} expected at least one Main Quest.`, diagnostics);
    addIfEmpty(act.sideQuests, "required structure", `Act ${act.key} expected at least one Side Quest.`, diagnostics);
    addIfEmpty(act.bossFights, "required structure", `Act ${act.key} expected at least one Boss Fight.`, diagnostics);

    for (const quest of [...act.mainQuests, ...act.sideQuests, ...act.bossFights]) {
      const searchable = normalize(`${quest.title} ${quest.description} ${quest.doneCondition}`);
      if (includesAny(searchable, VAGUE_DONE_PATTERNS)) {
        diagnostics.push({
          area: "done condition",
          message: `${quest.key} has a vague completion signal.`,
        });
      }
    }
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
  const searchable = normalize(
    content.inventoryItems.map((item) => `${item.name} ${item.purpose}`).join(" "),
  );

  if (!includesAny(searchable, PRACTICAL_INVENTORY_TERMS)) {
    diagnostics.push({ area: "inventory quality", message: "expected Inventory Items to be practical readiness items." });
  }

  void fixture;
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

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(normalize(term)));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase();
}
