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
                steps: [
                  { key: "step-generic-1", description: "Start working on the quest." },
                  { key: "step-generic-2", description: "Make progress on the goal." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "quest-filler",
                title: "Collect Coins",
                description: "Explore the area and collect coins for bonus task flavor.",
                doneCondition: "Three coins are collected.",
                rewardIntent: "Reward optional fun.",
                steps: [
                  { key: "step-filler-1", description: "Do the task." },
                  { key: "step-filler-2", description: "Keep going." },
                ],
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
                steps: [
                  { key: "step-choose-phrases", description: "Choose three recovery phrases for missing words." },
                  { key: "step-write-note", description: "Write each Spanish phrase with an English cue." },
                  { key: "step-practice-aloud", description: "Practice saying the phrases aloud twice." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1",
                title: "Shadow a short Spanish clip",
                description: "Repeat a short Spanish dialogue out loud to copy rhythm.",
                doneCondition: "A recording exists of the user shadowing one short dialogue from start to finish.",
                rewardIntent: "Reward low-pressure Spanish speaking practice.",
                steps: [
                  { key: "step-select-clip", description: "Select one short Spanish dialogue clip." },
                  { key: "step-record-shadow", description: "Record yourself shadowing the full dialogue." },
                  { key: "step-review-rhythm", description: "Review the recording and note one rhythm improvement." },
                ],
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

  it("reports missing or miscounted Main and Side Quest Steps", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    delete (content.acts[0]!.mainQuests[0]! as { steps?: unknown }).steps;
    content.acts[0]!.sideQuests[0]!.steps = Array.from({ length: 8 }, (_, index) => ({
      key: `step-too-many-${index + 1}`,
      description: `Write Spanish practice note ${index + 1}.`,
      sequenceNumber: index + 1,
    }));

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.assertions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expect.stringContaining("adventure-quest-step-quality"), status: "failed" }),
      ]),
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("quest-prompt-list must include 2–7") }),
        expect.objectContaining({ message: expect.stringContaining("quest-speaking-sprint has 8 Quest Steps") }),
      ]),
    );
  });

  it("reports vague, repeated, non-actionable, or unrelated Quest Steps without overfitting to cooking", () => {
    const fixture = buildFixture({
      id: "fitness-eval",
      name: "Fitness eval",
      goalText: "Build a sustainable strength habit with a knee-safe modification log.",
      interviewOutputArtifact: {
        ...buildFixture().interviewOutputArtifact,
        goalSummary: "Build a sustainable strength habit.",
        currentStage: "The user has dumbbells and knee concerns.",
        compactSourceSummary: "The user needs strength sessions, tracking, and knee-safe modifications.",
      },
      expectations: {
        ...buildFixture().expectations,
        expectedGoalTerms: ["strength", "knee"],
        expectedSkillThemes: ["tracking"],
        expectedInventoryThemes: ["log"],
      },
    });
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        goalSummary: "Build a sustainable strength habit with knee-safe modifications.",
        acts: [
          {
            key: "act-1",
            title: "Prepare the Training Hall",
            summary: "Set the first week up before lifting.",
            mainQuests: [
              {
                key: "quest-first-week-plan",
                title: "Plan the First Strength Week",
                description: "Choose three short strength sessions and a knee modification log.",
                doneCondition: "Three strength sessions and knee modifications are written in the log.",
                rewardIntent: "Reward a sustainable training plan.",
                steps: [
                  { key: "step-generic", description: "Make progress on the quest." },
                  { key: "step-repeated-a", description: "Write three strength sessions in the log." },
                  { key: "step-repeated-b", description: "Write three strength sessions in the log." },
                  { key: "step-unrelated", description: "Admire the sunset." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "quest-warm-up-checklist",
                title: "Create the Warm-Up Checklist",
                description: "Prepare a short warm-up checklist for each strength session.",
                doneCondition: "A warm-up checklist is ready beside the workout tracker.",
                rewardIntent: "Reward safer session setup.",
                steps: [
                  { key: "step-list-moves", description: "List three warm-up movements for strength sessions." },
                  { key: "step-note-knee", description: "Add a knee comfort check before each session." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-week-one",
                title: "Complete Week One",
                description: "Finish the first three planned strength sessions with modifications recorded.",
                doneCondition: "Three sessions are completed and the knee modification log is reviewed.",
                rewardIntent: "Reward proof that the habit can start safely.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, fixture);

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("generic filler") }),
        expect.objectContaining({ message: expect.stringContaining("repeats another Quest Step") }),
        expect.objectContaining({ message: expect.stringContaining("concrete user action") }),
        expect.objectContaining({ message: expect.stringContaining("connect to the Quest or fixture context") }),
      ]),
    );
  });

  it("reports Boss Fight Quest Step leakage when malformed content reaches quality checks", () => {
    const content = parseGeneratedAdventureContent(buildContentPayload());
    const bossFight = content.acts[0]!.bossFights[0]! as typeof content.acts[0]["bossFights"][0] & {
      steps: unknown[];
    };
    bossFight.steps = [{ key: "step-boss", description: "Write a checklist for the boss fight." }];

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "boss-coffee-chat is a Boss Fight and must not include Quest Steps.",
      }),
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

  it("accepts concrete user-controlled practice artifacts as Inventory", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        inventoryItems: [
          {
            key: "practice-audio-log",
            name: "Practice Audio Log",
            purpose:
              "A phone recording folder for short speaking drills and self-review of pronunciation, pace, and hesitation patterns.",
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ area: "inventory quality" }),
    );
  });

  it("fails people or groups modeled as Inventory", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        inventoryItems: [
          {
            key: "spanish-speaking-coworkers",
            name: "Spanish-Speaking Coworkers",
            purpose: "Offer short, real conversation reps and low-pressure practice exchanges when available.",
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: "inventory quality",
          message: expect.stringContaining("user-controlled artifact, tool, or routine"),
        }),
      ]),
    );
  });
});
