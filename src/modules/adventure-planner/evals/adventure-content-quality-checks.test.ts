import { describe, expect, it } from "vitest";

import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { checkGeneratedAdventureContentQuality } from "./adventure-content-quality-checks";
import type { GenerateAdventureEvalFixture } from "./generate-adventure-eval-types";
import { buildContentPayload, buildFixture } from "./focused-eval-test-helpers";

describe("Adventure content quality checks", () => {
  it("accepts grounded unlinked content without Skill rewards or Inventory links", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).toEqual([]);
    expect(result.assertions).toEqual(
      expect.arrayContaining([
        { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
        { id: "adventure-quest-quality", label: "Quest Quality", status: "passed" },
        { id: "adventure-side-quest-quality", label: "Side Quest Quality", status: "passed" },
        { id: "adventure-boss-fight-quality", label: "Boss Fight Quality", status: "passed" },
        { id: "adventure-fixture-grounding", label: "Fixture Grounding", status: "passed" },
      ]),
    );
  });

  it("reports weak Main Quest, Side Quest, and Boss Fight quality", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Generic Act",
            summary: "A generic act.",
            mainQuests: [
              {
                key: "quest-generic",
                title: "Continue Your Journey",
                description: "Work on the goal in a general way.",
                doneCondition: "Make progress.",
                rewardIntent: "Reward generic progress.",
              },
            ],
            sideQuests: [
              {
                key: "quest-filler",
                title: "Collect Coins",
                description: "Explore the area and collect coins for bonus task flavor.",
                doneCondition: "Three coins are collected.",
                rewardIntent: "Reward optional fun.",
              },
            ],
            bossFights: [
              {
                key: "boss-generic",
                title: "Final Task",
                description: "Complete the task.",
                doneCondition: "Finish it.",
                rewardIntent: "Reward completion.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics.map((diagnostic) => diagnostic.area)).toEqual(
      expect.arrayContaining([
        "done condition",
        "quest quality",
        "side quest quality",
        "boss fight quality",
      ]),
    );
    expect(result.assertions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "adventure-quest-quality", status: "failed" }),
        expect.objectContaining({ id: "adventure-side-quest-quality", status: "failed" }),
        expect.objectContaining({ id: "adventure-boss-fight-quality", status: "failed" }),
      ]),
    );
  });

  it("accepts Boss Fights with rehearsal proof language", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Practice in the Warm Light",
            summary: "Use repeatable speaking sessions to reduce freezing.",
            mainQuests: [
              {
                key: "mq-1",
                title: "Practice recovery phrases",
                description: "Practice simple Spanish recovery phrases for moments when a word is missing.",
                doneCondition: "A practice note contains three recovery phrases written in Spanish.",
                rewardIntent: "Reward preparing phrases for the coffee chat.",
              },
            ],
            sideQuests: [
              {
                key: "sq-1",
                title: "Shadow a short Spanish clip",
                description: "Repeat a short Spanish dialogue out loud to copy rhythm.",
                doneCondition: "A recording exists of the user shadowing one short dialogue from start to finish.",
                rewardIntent: "Reward low-pressure Spanish speaking practice.",
              },
            ],
            bossFights: [
              {
                key: "bf-2",
                title: "Freeze-break rehearsal",
                description:
                  "Simulate the moment of freezing, then immediately use a recovery phrase and continue speaking to prove the conversation can survive hesitation.",
                doneCondition:
                  "A timed rehearsal recording shows the user hit a planned pause, used a recovery phrase, and resumed speaking within a few seconds without switching to English.",
                rewardIntent:
                  "This tests the exact failure point and builds confidence for the moment when anxiety tries to interrupt speech.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ area: "boss fight quality" }),
    );
  });

  it("reports missing fixture grounding and weak next actions", () => {
    const fixture: GenerateAdventureEvalFixture = buildFixture({
      expectations: { ...buildFixture().expectations, expectedGoalTerms: ["Portuguese"], expectedSkillThemes: ["speaking"], expectedInventoryThemes: ["prompt"] },
    });
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        goalSummary: "Prepare a generic project.",
        skills: [{ key: "skill-plan", name: "Plan", description: "Plan a generic project." }],
        inventoryItems: [{ key: "item-plan", name: "Plan", purpose: "A project plan document." }],
        focusedNextActions: [{ title: "Begin", description: "Begin the journey." }],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(content, fixture).diagnostics;

    expect(diagnostics.map((diagnostic) => diagnostic.area)).toContain("fixture grounding");
    expect(diagnostics.map((diagnostic) => diagnostic.area)).toContain("next action quality");
  });
});
