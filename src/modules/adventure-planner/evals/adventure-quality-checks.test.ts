import { describe, expect, it } from "vitest";

import { buildGeneratedAdventureBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventure } from "../domain/generated-adventure";
import { checkGeneratedAdventureQuality } from "./adventure-quality-checks";
import type { GenerateAdventureEvalFixture } from "./generate-adventure-eval-types";

function buildFixture(overrides: Partial<GenerateAdventureEvalFixture> = {}): GenerateAdventureEvalFixture {
  return {
    id: "cooking-eval",
    name: "Cooking eval",
    goalText: "Learn weeknight cooking with repeatable meal planning.",
    interviewOutputArtifact: {
      goalSummary: "Cook three practical weeknight dinners.",
      goalType: "cooking skill",
      coreWhy: "Feel confident feeding myself after work.",
      motivationDetails: ["Feel confident feeding myself after work"],
      successDefinition: "Three dinners are cooked and reviewed.",
      currentStage: "Can follow recipes but needs meal planning routines.",
      currentSkillOrBaseline: "Can follow recipes but needs meal planning routines.",
      blockers: ["Time pressure"],
      constraints: ["Thirty-minute weeknight sessions"],
      existingResources: ["Kitchen tools", "Recipe bookmarks"],
      likelyMissingResources: ["Weekly menu template"],
      missingResources: ["Weekly menu template"],
      safetyBoundaries: ["Educational cooking guidance only"],
      preferences: ["Cozy guild framing"],
      dislikesOrAvoidances: ["Avoid overlong weeknight cooking"],
      priorAttempts: ["Has followed recipes before"],
      confidenceGaps: ["Needs meal planning routines"],
      examplesOrInspirations: ["Practical weeknight dinners"],
      firstMilestoneReadiness: "Ready for a first weeknight meal-planning milestone.",
      compactSourceSummary: "The user wants practical cooking routines.",
    },
    transcript: [{ role: "user", content: "I want to cook dinner more often." }],
    expectations: {
      highStakesSafety: false,
      expectedGoalTerms: ["cooking"],
      expectedSkillThemes: ["meal"],
      expectedInventoryThemes: ["template"],
      forbiddenAdvicePatterns: ["guaranteed cure"],
    },
    ...overrides,
  };
}

function checkPayload(payload = buildGeneratedAdventureBoundaryPayload(), fixture = buildFixture()) {
  return checkGeneratedAdventureQuality(parseGeneratedAdventure(payload), fixture);
}

function messagesFor(payload = buildGeneratedAdventureBoundaryPayload(), fixture = buildFixture()): string[] {
  return checkPayload(payload, fixture).diagnostics.map(
    (diagnostic) => `${diagnostic.area}: ${diagnostic.message}`,
  );
}

describe("checkGeneratedAdventureQuality", () => {
  it("passes a strong parser-compatible generated Adventure with named assertions", () => {
    const result = checkPayload();

    expect(result.diagnostics).toEqual([]);
    expect(result.assertions).toEqual(
      expect.arrayContaining([
        { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
        { id: "adventure-quest-quality", label: "Quest Quality", status: "passed" },
        { id: "adventure-references", label: "References", status: "passed" },
        { id: "adventure-progression-balance", label: "Progression Balance", status: "passed" },
        { id: "adventure-fixture-grounding", label: "Fixture Grounding", status: "passed" },
      ]),
    );
    expect(result.assertions.length).toBeGreaterThan(1);
  });

  it("fails vague Quest and Boss Fight done conditions with concise diagnostics", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          mainQuests: [
            { ...payload.acts[0].mainQuests[0], doneCondition: "Complete the task." },
          ],
          bossFights: [
            { ...payload.acts[0].bossFights[0], doneCondition: "Make progress." },
          ],
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("done condition"),
        expect.stringContaining("Plan the First Menu"),
        expect.stringContaining("First Weeknight Service"),
      ]),
    );
  });

  it("fails filler Side Quests", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          sideQuests: [
            {
              ...payload.acts[0].sideQuests[0],
              title: "Collect Coins",
              description: "Explore the area and collect coins for bonus task flavor.",
              doneCondition: "Three coins are collected.",
            },
          ],
        },
      ],
    });

    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("side quest quality")]));
  });

  it("fails generic Main Quests", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          mainQuests: [
            {
              ...payload.acts[0].mainQuests[0],
              title: "Advance the Adventure",
              description: "Continue your journey and work on the goal.",
              doneCondition: "One planning note is written.",
            },
          ],
        },
      ],
    });

    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("quest quality")]));
  });

  it("accepts Boss Fights with live proof language", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const result = checkPayload({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          bossFights: [
            {
              ...payload.acts[0].bossFights[0],
              title: "Ten-minute Spanish coffee chat under real conditions",
              description:
                "Face the final live test in a normal coffee-chat setting where the main challenge is staying calm, keeping questions flowing, and recovering without defaulting to English.",
              doneCondition:
                "A live chat note, witness confirmation, or recording shows a full ten-minute Spanish coffee chat with prepared topics, follow-up questions, and a brief reflection afterward.",
            },
          ],
        },
      ],
    });

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ area: "boss fight quality" }),
    );
  });

  it("fails random fantasy Inventory", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      inventoryItems: [
        {
          key: "weekly-menu-template",
          name: "Magic Sword",
          purpose: "A magic sword looted from a dragon scale chest.",
        },
        payload.inventoryItems[1],
      ],
    });

    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("inventory quality")]));
  });

  it("accepts concrete user-controlled practice artifacts as Inventory", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const result = checkPayload({
      ...payload,
      inventoryItems: [
        {
          key: "weekly-menu-template",
          name: "Practice Audio Log",
          purpose:
            "A phone recording folder for short speaking drills and self-review of pronunciation, pace, and hesitation patterns.",
        },
        payload.inventoryItems[1],
      ],
    });

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ area: "inventory quality" }),
    );
  });

  it("fails people or groups modeled as Inventory", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      inventoryItems: [
        {
          key: "weekly-menu-template",
          name: "Spanish-Speaking Coworkers",
          purpose: "Offer short, real conversation reps and low-pressure practice exchanges when available.",
        },
        payload.inventoryItems[1],
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "'Spanish-Speaking Coworkers' should be a user-controlled artifact, tool, or routine",
        ),
      ]),
    );
  });

  it("fails decorative Skills", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      skills: [{ key: "meal-planning", name: "Strength", description: "Gain raw power." }, payload.skills[1]],
    });

    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("skill quality")]));
  });

  it("fails weak Achievement unlock conditions", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      achievements: [
        {
          ...payload.achievements[0],
          unlockCondition: "Make progress.",
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining("achievement quality")]),
    );
  });

  it("fails generic focused next actions", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      focusedNextActions: [{ title: "Begin", description: "Start working and keep going." }],
    });

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining("next action quality")]),
    );
  });

  it("fails missing fixture grounding", () => {
    const messages = messagesFor(buildGeneratedAdventureBoundaryPayload(), {
      ...buildFixture(),
      expectations: {
        ...buildFixture().expectations,
        expectedGoalTerms: ["marathon"],
      },
    });

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining("expected generated Adventure")]),
    );
  });

  it("fails duplicate references and out-of-range XP rewards", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          mainQuests: [
            {
              ...payload.acts[0].mainQuests[0],
              skillRewards: [
                { skillKey: "meal-planning", xp: 200 },
                { skillKey: "meal-planning", xp: 25 },
              ],
              inventoryItemKeys: ["weekly-menu-template", "weekly-menu-template"],
            },
          ],
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("duplicate XP"),
        expect.stringContaining("XP must be an integer from"),
        expect.stringContaining("duplicate Inventory Item link"),
      ]),
    );
  });

  it("allows a Quest to award Skill XP without an Inventory Item link", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const result = checkPayload({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          mainQuests: [
            {
              ...payload.acts[0].mainQuests[0],
              inventoryItemKeys: [],
            },
          ],
        },
      ],
    });

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "references",
        message: expect.stringContaining("expected at least one relevant Inventory Item link"),
      }),
    );
  });

  it("fails unused Skills and Inventory Items in the final progression", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const messages = messagesFor({
      ...payload,
      skills: [
        ...payload.skills,
        {
          key: "unused-food-budgeting",
          name: "Food Budgeting",
          description: "Plan grocery spending for practical meals.",
        },
      ],
      inventoryItems: [
        ...payload.inventoryItems,
        {
          key: "unused-budget-template",
          name: "Budget Template",
          purpose: "A practical template for planning grocery spending.",
        },
      ],
    });

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Skill 'Food Budgeting' is never rewarded"),
        expect.stringContaining("Inventory Item 'Budget Template' is never used"),
      ]),
    );
  });

  it("accepts meaningful Boss Fights with lower XP than a major Quest", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();
    const result = checkPayload({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          mainQuests: [
            {
              ...payload.acts[0].mainQuests[0],
              skillRewards: [{ skillKey: "meal-planning", xp: 80 }],
            },
          ],
          bossFights: [
            {
              ...payload.acts[0].bossFights[0],
              skillRewards: [
                { skillKey: "meal-planning", xp: 25 },
                { skillKey: "knife-basics", xp: 20 },
              ],
            },
          ],
        },
      ],
    });

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "progression balance",
        message: expect.stringContaining("Boss Fight reward total"),
      }),
    );
  });

  it("fails high-stakes authoritative advice patterns", () => {
    const payload = buildGeneratedAdventureBoundaryPayload({
      goalSummary: "Create a debt payoff plan with guaranteed return tactics.",
      safetyNotes: ["Use this as educational structure and consult a licensed professional."],
    });
    const fixture = buildFixture({
      expectations: {
        ...buildFixture().expectations,
        highStakesSafety: true,
        expectedGoalTerms: ["debt"],
        expectedSkillThemes: ["meal"],
        expectedInventoryThemes: ["template"],
        forbiddenAdvicePatterns: ["guaranteed return"],
      },
    });

    const messages = messagesFor(payload, fixture);

    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("safety")]));
    expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("guaranteed return")]));
  });

  it("fails missing non-authoritative safety notes for high-stakes fixtures", () => {
    const messages = messagesFor(
      buildGeneratedAdventureBoundaryPayload({ safetyNotes: ["Stay focused on the plan."] }),
      buildFixture({
        expectations: {
          ...buildFixture().expectations,
          highStakesSafety: true,
        },
      }),
    );

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining("missing non-authoritative safety note")]),
    );
  });

  it("reports named failed assertions with existing diagnostic detail", () => {
    const payload = buildGeneratedAdventureBoundaryPayload({ safetyNotes: ["Stay focused on the plan."] });
    const result = checkPayload(
      payload,
      buildFixture({
        expectations: {
          ...buildFixture().expectations,
          highStakesSafety: true,
        },
      }),
    );

    expect(result.assertions).toEqual(
      expect.arrayContaining([
        {
          id: "adventure-safety",
          label: "Safety",
          status: "failed",
          message: "missing non-authoritative safety note.",
        },
      ]),
    );
  });
});
