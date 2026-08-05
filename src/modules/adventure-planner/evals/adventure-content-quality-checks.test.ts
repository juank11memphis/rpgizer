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
                  { key: "step-unrelated", description: "Admire the clouds." },
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

  it("accepts artifact-preserving Quest Steps that keep work in one reachable note", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Foundations Under the Table",
            summary: "Set up a simple Spanish practice loop.",
            mainQuests: [
              {
                key: "mq-1-build-the-coffee-kit",
                title: "Build the coffee chat kit",
                description: "Assemble Spanish speaking materials for a coffee chat.",
                doneCondition:
                  "A single notebook page or note exists with three topics, two follow-up questions for each topic, and five rescue phrases.",
                rewardIntent: "Create a reusable speaking scaffold for the coffee chat.",
                steps: [
                  { key: "mq-1-step-1", description: "Write three likely coffee-chat topics you can talk about in Spanish." },
                  { key: "mq-1-step-2", description: "Add two follow-up questions under each topic." },
                  { key: "mq-1-step-3", description: "List five rescue phrases for pauses, repetition, and clarification." },
                  { key: "mq-1-step-4", description: "Keep all of this in one notebook page or note you can open quickly." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1-speaking-sprint",
                title: "Practice a coffee-chat sprint",
                description: "Practice Spanish aloud using the coffee chat kit.",
                doneCondition: "One recorded speaking sprint is reviewed with a reflection note.",
                rewardIntent: "Reward low-pressure Spanish speaking practice.",
                steps: [
                  { key: "sq-1-step-1", description: "Choose one topic from the coffee chat kit." },
                  { key: "sq-1-step-2", description: "Record a five-minute Spanish speaking sprint." },
                  { key: "sq-1-step-3", description: "Write one reflection note after listening back." },
                ],
              },
            ],
            bossFights: [
              {
                key: "bf-1-coffee-chat",
                title: "Ten-minute coffee chat",
                description: "Complete a ten-minute Spanish coffee chat.",
                doneCondition: "A ten-minute Spanish coffee chat is completed and reflected on.",
                rewardIntent: "Reward proof of live conversation confidence.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "mq-1-build-the-coffee-kit.steps[3] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts concrete setup steps that mark, leave, draw, or make an artifact usable", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Gather the Tavern Supplies",
            summary: "Prepare the Spanish practice route.",
            mainQuests: [
              {
                key: "quest-2",
                title: "Lay out the weekly practice route",
                description: "Turn weekday and weekend time into a visible Spanish practice rhythm.",
                doneCondition: "A weekly schedule is written with a fallback option for disrupted days.",
                rewardIntent: "Support consistent Spanish practice.",
                steps: [
                  { key: "step-1", description: "Choose the specific weekday time slot for twenty-minute practice sessions." },
                  { key: "step-2", description: "Write the sessions into a calendar, notebook, or schedule page." },
                  { key: "step-3", description: "Mark one fallback option for days when the first time slot gets disrupted." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sidequest-1",
                title: "Set up the reflection ledger",
                description: "Create a simple record of Spanish practice.",
                doneCondition: "A reflection tracker page is ready with session notes and reusable phrases.",
                rewardIntent: "Make practice feedback visible.",
                steps: [
                  { key: "step-1", description: "Draw three columns labeled session, what felt hard, and what improved." },
                  { key: "step-2", description: "Leave space for one Spanish phrase to reuse next time." },
                  { key: "step-3", description: "Make the page easy to fill in after each practice session." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-1",
                title: "First live Spanish opening",
                description: "Open a low-pressure Spanish conversation.",
                doneCondition: "A live Spanish opening is completed and documented.",
                rewardIntent: "Reward entering a real conversation.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ area: "quest step quality" }),
    );
  });

  it("accepts recovery-line steps that use singular phrase wording from a phrases quest", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Find Your Voice",
            summary: "Build a low-pressure Spanish speaking setup.",
            mainQuests: [
              {
                key: "mq-2-collect-recovery-lines",
                title: "Collect Recovery Lines",
                description:
                  "Assemble short Spanish phrases that help you stay in Spanish when you hesitate, forget a word, or need to restart.",
                doneCondition: "A note card contains at least three recovery phrases spoken aloud three times.",
                rewardIntent: "Turn panic moments into usable conversation tools.",
                steps: [
                  { key: "mq-2-step-1", description: "Choose a simple phrase for buying time while thinking." },
                  { key: "mq-2-step-2", description: "Choose a phrase for asking how to say a word or idea." },
                  { key: "mq-2-step-3", description: "Choose a phrase for restarting a sentence after freezing." },
                  { key: "mq-2-step-4", description: "Practice saying each phrase out loud three times." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1-listen-for-real-phrasing",
                title: "Listen for real phrasing",
                description: "Use short listening practice to notice everyday Spanish phrasing.",
                doneCondition: "Three usable phrases from a short Spanish clip are written into your notes.",
                rewardIntent: "Build familiarity with conversational rhythm.",
                steps: [
                  { key: "sq-1-step-1", description: "Play a short Spanish audio clip that matches beginner level and listen once without stopping it." },
                  { key: "sq-1-step-2", description: "Write down three phrases that could fit a coffee chat." },
                  { key: "sq-1-step-3", description: "Repeat those phrases aloud." },
                ],
              },
            ],
            bossFights: [
              {
                key: "bf-1-first-live-sentence",
                title: "First live sentence trial",
                description: "Speak a short Spanish message to another person.",
                doneCondition: "A speaking attempt shows one full Spanish sentence and one rescue phrase.",
                rewardIntent: "Prove you can stay in Spanish long enough to recover.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "mq-2-collect-recovery-lines.steps[0] should connect to the Quest or fixture context.",
      }),
    );
  });

  it("accepts rescue-phrase steps that say phrases aloud", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Build the Fire",
            summary: "Create prompts, schedule, and rescue phrases for Spanish practice.",
            mainQuests: [
              {
                key: "main-quest-1-prompt-kit",
                title: "Forge the Coffee Chat Prompt Kit",
                description: "Create Spanish conversation prompts for the coffee chat.",
                doneCondition: "The notebook contains five topics and follow-up questions written in Spanish.",
                rewardIntent: "Create a reusable conversation map.",
                steps: [
                  { key: "step-1-topic-list", description: "Write five likely coffee-chat topics in the notebook." },
                  { key: "step-2-follow-up-questions", description: "Add two follow-up questions under each topic in Spanish." },
                  { key: "step-3-personal-answers", description: "Draft one short answer for each topic." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-1-rescue-phrases",
                title: "Craft the Rescue Phrase Card",
                description: "Prepare a small Spanish phrase card for when the mind goes blank.",
                doneCondition: "A small card contains three rescue phrases spoken aloud three times.",
                rewardIntent: "Build a practical safety net for anxiety spikes.",
                steps: [
                  { key: "step-1-pick-phrases", description: "Choose three rescue phrases for repeating or slowing down." },
                  { key: "step-2-write-small", description: "Write the phrases on a card or note app." },
                  { key: "step-3-test-out-loud", description: "Say each phrase aloud three times so the card matches your speaking pace." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1-first-live-loop",
                title: "The First Live Loop",
                description: "Hold a short live Spanish exchange.",
                doneCondition: "A speaking exchange shows one Spanish question and one follow-up.",
                rewardIntent: "Prove the user can stay in Spanish under pressure.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-1-rescue-phrases.steps[2] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts plausible imperative openings without adding every verb to the action allowlist", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Foundations at the Tavern Door",
            summary: "Make Spanish speaking less intimidating with prompts and a weekly rhythm.",
            mainQuests: [
              {
                key: "mq-2-weekly-rhythm",
                title: "Set the Practice Watch",
                description: "Build a realistic weekly Spanish speaking rhythm around available practice time.",
                doneCondition: "A two-week speaking schedule shows weekday practice blocks and one weekend slot.",
                rewardIntent: "Turn Spanish learning into a repeatable routine.",
                steps: [
                  { key: "mq-2-step-1", description: "Block twenty-minute weekday sessions on your calendar for the next two weeks." },
                  { key: "mq-2-step-2", description: "Reserve one longer weekend practice slot for a speaking review." },
                  { key: "mq-2-step-3", description: "Attach one specific task to each slot, such as shadowing, prompt answering, or recording a reply." },
                  { key: "mq-2-step-4", description: "Put the schedule where you will see it before your usual practice time." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1-anxiety-map",
                title: "Map the Freeze Points",
                description: "Identify what happens when you freeze during Spanish speaking.",
                doneCondition: "A reflection note names one freeze trigger and one rescue phrase.",
                rewardIntent: "Separate anxiety from language gaps.",
                steps: [
                  { key: "sq-1-step-1", description: "Write where you froze first after one speaking attempt." },
                  { key: "sq-1-step-2", description: "Circle the moment you switched to English." },
                  { key: "sq-1-step-3", description: "Write one rescue phrase you can use next time." },
                ],
              },
            ],
            bossFights: [
              {
                key: "bf-1-first-live-reply",
                title: "The First Live Reply",
                description: "Face a live Spanish exchange under light pressure.",
                doneCondition: "A note shows one live or simulated conversation where you answered in Spanish first.",
                rewardIntent: "Prove you can survive the opening pressure.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "mq-2-weekly-rhythm.steps[2] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts natural imperative openings with concrete object or context signals", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Foundations at the Tavern Door",
            summary: "Make Spanish speaking less intimidating with prompts and a weekly rhythm.",
            mainQuests: [
              {
                key: "mq-1-prompt-practice",
                title: "Shape the Coffee Chat Practice",
                description: "Prepare a Spanish prompt routine for a coffee chat.",
                doneCondition: "A prompt routine is written with topics and practice notes.",
                rewardIntent: "Make practice easier to repeat.",
                steps: [
                  { key: "step-1", description: "Pair each coffee-chat topic with one follow-up question." },
                  { key: "step-2", description: "Thread one rescue phrase into the practice script." },
                  { key: "step-3", description: "Label the prompt list for weekday Spanish practice." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1-reflection",
                title: "Build the Spanish reflection page",
                description: "Create a tracker for Spanish speaking practice.",
                doneCondition: "A tracker page is ready for practice notes.",
                rewardIntent: "Make Spanish practice visible.",
                steps: [
                  { key: "step-1", description: "Name one freeze trigger from the last Spanish practice attempt." },
                  { key: "step-2", description: "Rate each practice prompt for comfort and usefulness." },
                ],
              },
            ],
            bossFights: [
              {
                key: "bf-1-first-live-reply",
                title: "The First Live Reply",
                description: "Face a live Spanish exchange under light pressure.",
                doneCondition: "A note shows one live or simulated conversation where you answered in Spanish first.",
                rewardIntent: "Prove you can survive the opening pressure.",
              },
            ],
          },
        ],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(content, buildFixture()).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: expect.stringContaining("should start from a concrete user action"),
      }),
    );
  });

  it("still rejects weak or mental-only Quest Step openings", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
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
                  { key: "step-1", description: "Imagine the strength sessions going well this week." },
                  { key: "step-2", description: "Start the strength quest with positive energy." },
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
                  { key: "step-1", description: "List three warm-up movements for strength sessions." },
                  { key: "step-2", description: "Add a knee comfort check before each session." },
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

    const diagnostics = checkGeneratedAdventureContentQuality(content, buildFixture()).diagnostics;

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          area: "quest step quality",
          message: "quest-first-week-plan.steps[0] should start from a concrete user action, decision, check, or artifact.",
        }),
        expect.objectContaining({
          area: "quest step quality",
          message: "quest-first-week-plan.steps[1] should start from a concrete user action, decision, check, or artifact.",
        }),
      ]),
    );
  });

  it("does not treat contextual keep-going wording as generic filler", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Gather Your Tavern Gear",
            summary: "Assemble Spanish prompts, schedule, and reflection tools.",
            mainQuests: [
              {
                key: "main-quest-1",
                title: "Build the coffee-chat prompt kit",
                description: "Create a compact set of Spanish phrases and topics.",
                doneCondition: "The prompt list contains greetings, follow-up stems, and conversation topics.",
                rewardIntent: "Reduce blank moments during live Spanish practice.",
                steps: [
                  { key: "step-1", description: "Write five greeting phrases you can say without hesitation." },
                  { key: "step-2", description: "Add five follow-up question stems." },
                  { key: "step-3", description: "Choose three safe topics for a short coffee chat." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-2",
                title: "Make a reflection tracker page",
                description: "Track what happens after Spanish practice so freezing patterns become visible.",
                doneCondition: "A reflection tracker page is ready with columns for date, topic, freeze point, helpful phrase, and follow-up question.",
                rewardIntent: "Turn practice into visible progress.",
                steps: [
                  { key: "step-1", description: "Draw columns for date, what you spoke about, and where you froze." },
                  { key: "step-2", description: "Add a space for one phrase that helped you keep going." },
                  { key: "step-3", description: "Leave room to note one follow-up question you successfully asked." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "The first ten-minute Spanish coffee chat",
                description: "Hold a real Spanish coffee chat with follow-up questions.",
                doneCondition: "A ten-minute coffee chat is completed in Spanish and reflected on.",
                rewardIntent: "Prove the skill works under real conversation pressure.",
              },
            ],
          },
        ],
      }),
    );

    const result = checkGeneratedAdventureContentQuality(content, buildFixture());

    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-2.steps[1] is generic filler instead of quest-specific guidance.",
      }),
    );
  });

  it("grounds Quest Steps through lemmatized word variants", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Train the Voice",
            summary: "Use short Spanish speaking drills to reduce freezing.",
            mainQuests: [
              {
                key: "main-quest-2",
                title: "Run short solo speaking drills",
                description: "Practice speaking aloud before a real Spanish conversation.",
                doneCondition: "Two recorded practice rounds include spoken answers to three prompts.",
                rewardIntent: "Build confidence through practiced conversation routes.",
                steps: [
                  { key: "step-1", description: "Read your self-introduction aloud once and record it." },
                  { key: "step-2", description: "Answer three prompt questions aloud using short sentences." },
                  { key: "step-3", description: "Replay one recording and note one phrase that sounded usable." },
                  { key: "step-4", description: "Practice the prompts again after speaking feels easier." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-3",
                title: "Log the evidence of progress",
                description: "Keep a reflection record so freezing patterns become visible.",
                doneCondition: "Four practice entries are written with one challenge note each.",
                rewardIntent: "Make practice more effective over time.",
                steps: [
                  { key: "step-1", description: "Write one thing that felt easier than last time." },
                  { key: "step-2", description: "Write one moment where you froze or hesitated." },
                  { key: "step-3", description: "Choose one adjustment for the next practice session." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "The live-speaking rehearsal gate",
                description: "Run a short Spanish conversation pressure test.",
                doneCondition: "A simulated conversation is completed with one recovery from hesitation.",
                rewardIntent: "Prove Spanish speaking can continue after a freeze.",
              },
            ],
          },
        ],
      }),
    );

    const fixture = buildFixture({
      interviewOutputArtifact: {
        ...buildFixture().interviewOutputArtifact,
        successDefinition: "A ten-minute coffee chat is completed with prepared topics, follow-up questions, and a short reflection.",
      },
    });
    const diagnostics = checkGeneratedAdventureContentQuality(content, fixture).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "main-quest-2.steps[2] should connect to the Quest or fixture context.",
      }),
    );
    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "main-quest-2.steps[3] should connect to the Quest or fixture context.",
      }),
    );
    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-3.steps[1] should connect to the Quest or fixture context.",
      }),
    );
  });

  it("accepts compound observation steps that end with a concrete artifact action", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Small Talk at the Table",
            summary: "Practice short Spanish exchanges.",
            mainQuests: [
              {
                key: "main-quest-1",
                title: "Practice short speech bursts",
                description: "Use short timed Spanish speaking bursts.",
                doneCondition: "Two recorded Spanish clips and one reflection note are saved.",
                rewardIntent: "Create proof that speaking can continue.",
                steps: [
                  { key: "step-1", description: "Speak for thirty seconds in Spanish about one coffee-chat topic." },
                  { key: "step-2", description: "Write one sentence in your reflection tracker about what helped." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-2-build-a-five-minute-silent-rehearsal",
                title: "Build a silent rehearsal",
                description: "Rehearse the first minute of the coffee chat out loud.",
                doneCondition: "The greeting, first topic, and two questions are spoken aloud and difficult words are marked.",
                rewardIntent: "Reduce the first-second freeze.",
                steps: [
                  { key: "step-1", description: "Read your greeting and first topic aloud three times." },
                  { key: "step-2", description: "Say two follow-up questions aloud without looking at the page." },
                  { key: "step-3", description: "Notice which words cause hesitation and circle them in the notebook." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "Survive the freeze moment",
                description: "Test whether you can recover after your mind goes blank.",
                doneCondition: "A recorded practice includes a freeze, pause, and successful restart.",
                rewardIntent: "Prove freezing is no longer a dead end.",
              },
            ],
          },
        ],
      }),
    );

    const fixture = buildFixture({
      interviewOutputArtifact: {
        ...buildFixture().interviewOutputArtifact,
        successDefinition: "A ten-minute coffee chat is completed with prepared topics, follow-up questions, and a short reflection.",
      },
    });
    const diagnostics = checkGeneratedAdventureContentQuality(content, fixture).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message:
          "side-quest-2-build-a-five-minute-silent-rehearsal.steps[2] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts pick as a concrete selection action", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Stirring the Pot",
            summary: "Build a tiny system for Spanish speaking practice.",
            mainQuests: [
              {
                key: "main-quest-prompt-kit",
                title: "Build the coffee-chat prompt kit",
                description: "Create Spanish prompts and recovery phrases for a ten-minute coffee chat.",
                doneCondition: "The notebook contains a dated prompt kit with topics and follow-up questions.",
                rewardIntent: "Turn scattered vocabulary into a usable speaking aid.",
                steps: [
                  { key: "step-1", description: "List three safe coffee-chat topics you can always talk about." },
                  { key: "step-2", description: "Write at least two follow-up questions under each topic." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-app-to-speech",
                title: "Turn app streaks into spoken lines",
                description: "Use the existing language app streak as a bridge from recognition to speech.",
                doneCondition: "A note or recording shows five app phrases spoken aloud in full Spanish sentences.",
                rewardIntent: "Connect familiar vocabulary to real speaking output.",
                steps: [
                  { key: "step-1", description: "Pick five words or phrases from the app that feel usable in a coffee chat." },
                  { key: "step-2", description: "Say each item out loud in a full sentence." },
                  { key: "step-3", description: "Record one sentence for later review and compare it to the app wording." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-pressure-chat-rehearsal",
                title: "Pressure chat rehearsal",
                description: "Run a timed mock coffee chat.",
                doneCondition: "A timed practice recording shows a ten-minute mock chat.",
                rewardIntent: "Create proof that live conversation pressure is manageable.",
              },
            ],
          },
        ],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(
      content,
      buildFixture({
        interviewOutputArtifact: {
          ...buildFixture().interviewOutputArtifact,
          successDefinition: "A ten-minute coffee chat is completed with prepared topics, follow-up questions, and a short reflection.",
        },
      }),
    ).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-app-to-speech.steps[0] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts pull as a concrete extraction action", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Gather the First Phrases",
            summary: "Collect Spanish words and prompts for a coffee chat.",
            mainQuests: [
              {
                key: "mq-1",
                title: "Build a Coffee Chat Prompt List",
                description: "Create Spanish conversation prompts and follow-up questions.",
                doneCondition: "A prompt list exists in a notebook with topics and questions.",
                rewardIntent: "Create a support scaffold for Spanish conversation practice.",
                steps: [
                  { key: "step-1", description: "Choose three everyday topics that fit a coffee chat." },
                  { key: "step-2", description: "Write two opening questions for each topic in Spanish." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "sq-1",
                title: "Phrase Bank for Coffee Small Talk",
                description: "Collect useful everyday words and short phrases from your app or notebook.",
                doneCondition: "A notebook page contains ten relevant Spanish words or short phrases grouped by coffee-chat topic.",
                rewardIntent: "Make Spanish practice more usable.",
                steps: [
                  { key: "step-1", description: "Pull ten words or short phrases from your current lessons that fit coffee-chat topics." },
                  { key: "step-2", description: "Group them under topic headings in your notebook." },
                  { key: "step-3", description: "Choose the five that feel easiest to say out loud right now." },
                ],
              },
            ],
            bossFights: [
              {
                key: "bf-1",
                title: "The First Live Spanish Exchange",
                description: "Face the pressure of speaking with another person in Spanish.",
                doneCondition: "A live or recorded Spanish exchange lasts at least two minutes.",
                rewardIntent: "Test whether the speaking tools work under conversational pressure.",
              },
            ],
          },
        ],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(content, buildFixture()).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "sq-1.steps[0] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("grounds Quest Steps through the fixture success definition", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1",
            title: "Gather the Tavern Supplies",
            summary: "Build the basic Spanish tools and routine.",
            mainQuests: [
              {
                key: "main-quest-1",
                title: "Forge the Coffee-Chat Prompt Kit",
                description: "Create prompts and rescue phrases for speaking anxiety.",
                doneCondition: "A saved prompt list contains three topics and six follow-up questions.",
                rewardIntent: "Create a reliable conversation support tool.",
                steps: [
                  { key: "step-1", description: "Choose three everyday topics that fit a casual coffee chat." },
                  { key: "step-2", description: "Write two follow-up questions for each topic in simple Spanish." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-1",
                title: "Stock the Practice Notebook",
                description: "Organize the notebook into a usable speaking journal.",
                doneCondition: "The notebook has a labeled speaking section and five dated practice pages.",
                rewardIntent: "Make progress visible and create a record of what helps.",
                steps: [
                  { key: "step-1", description: "Divide one notebook section into prompts, phrases, and reflections." },
                  { key: "step-2", description: "Write the date at the top of the next five practice pages." },
                  { key: "step-3", description: "Add a quick rating line for comfort, fluency, and number of follow-up questions used." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "The First Live Spanish Exchange",
                description: "Test speaking with another person in Spanish.",
                doneCondition: "A practice summary shows a live Spanish exchange of at least five minutes.",
                rewardIntent: "Confirm support tools work under pressure.",
              },
            ],
          },
        ],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(
      content,
      buildFixture({
        interviewOutputArtifact: {
          ...buildFixture().interviewOutputArtifact,
          successDefinition: "A ten-minute coffee chat is completed with prepared topics, follow-up questions, and a short reflection.",
        },
      }),
    ).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-1.steps[2] should connect to the Quest or fixture context.",
      }),
    );
  });

  it("accepts speak as a concrete spoken-practice action", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        acts: [
          {
            key: "act-1-foundations-and-phrases",
            title: "Act I: Foundations and Rescue Phrases",
            summary: "Build Spanish prompts and first low-pressure repetitions.",
            mainQuests: [
              {
                key: "main-quest-2-first-aloud-round",
                title: "Complete the First Aloud Practice Round",
                description: "Run a short solo speaking session using the prompt kit.",
                doneCondition: "A dated practice note shows a 10-minute solo speaking round with six prompts spoken aloud.",
                rewardIntent: "Turn speaking into a repeatable action.",
                steps: [
                  { key: "step-1", description: "Set a 10-minute timer for speaking practice." },
                  { key: "step-2", description: "Speak through at least six prompts from the prompt kit in Spanish." },
                  { key: "step-3", description: "Use at least one rescue phrase when you hesitate." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-1-phrase-card",
                title: "Make a Pocket Phrase Card",
                description: "Prepare a tiny reference card for quick Spanish review.",
                doneCondition: "A pocket phrase card exists and is used during one practice session.",
                rewardIntent: "Support fast recall before speaking.",
                steps: [
                  { key: "step-1", description: "Choose six phrases from the notebook that feel most useful." },
                  { key: "step-2", description: "Write them on a single index card or small note." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "The Frozen-Moment Recovery Test",
                description: "Recover without abandoning Spanish.",
                doneCondition: "A practice exchange includes a freeze moment recovered with a rescue phrase.",
                rewardIntent: "Prove the user can stay in the conversation.",
              },
            ],
          },
        ],
      }),
    );

    const diagnostics = checkGeneratedAdventureContentQuality(content, buildFixture()).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "main-quest-2-first-aloud-round.steps[1] should start from a concrete user action, decision, check, or artifact.",
      }),
    );
  });

  it("accepts find as a concrete discovery action for high-stakes organization steps", () => {
    const content = parseGeneratedAdventureContent(
      buildContentPayload({
        title: "The Ledger of Clear Numbers",
        themeSummary: "A calm, non-authoritative debt organization quest.",
        goalSummary: "Build a safe debt payoff organization system that reduces overwhelm.",
        safetyNotes: [
          "This adventure is for organization and education only, not financial advice.",
          "Consult a qualified financial professional before choosing a strategy.",
        ],
        acts: [
          {
            key: "act-1",
            title: "Map the Current Debt Field",
            summary: "Turn scattered statements into one reliable inventory.",
            mainQuests: [
              {
                key: "main-quest-1",
                title: "Build the debt inventory",
                description: "Collect core facts for each credit card without making decisions too early.",
                doneCondition: "A tracker shows each credit card account with balance, minimum payment, due date, and APR.",
                rewardIntent: "Create a trustworthy snapshot for professional conversation.",
                steps: [
                  { key: "step-1", description: "List every credit card account you can identify." },
                  { key: "step-2", description: "Record the balance, minimum payment, due date, and APR for each account." },
                ],
              },
            ],
            sideQuests: [
              {
                key: "side-quest-1",
                title: "Gather the statement stack",
                description: "Collect every recent card statement into one physical or digital place.",
                doneCondition: "A single folder or file contains recent source documents for each credit card account.",
                rewardIntent: "Lower transcription errors and make review more reliable.",
                steps: [
                  { key: "step-1", description: "Find paper statements, downloaded PDFs, or portal screenshots for each card." },
                  { key: "step-2", description: "Place them in one folder, envelope, or file named for this debt review." },
                  { key: "step-3", description: "Check that each account has at least one recent source document saved." },
                ],
              },
            ],
            bossFights: [
              {
                key: "boss-fight-1",
                title: "Prepare a professional-ready debt snapshot",
                description: "Create a clean summary and question set for a qualified financial professional.",
                doneCondition: "A one-page summary and question list are ready to share.",
                rewardIntent: "Present the situation clearly without deciding alone.",
              },
            ],
          },
        ],
      }),
    );

    const fixture = buildFixture({
      id: "high-stakes-boundary",
      name: "High stakes boundary",
      goalText: "Organize credit card debt details before talking to a qualified financial professional.",
      interviewOutputArtifact: {
        ...buildFixture().interviewOutputArtifact,
        goalSummary: "Build a safe debt payoff organization system.",
        compactSourceSummary: "The user needs to organize debt facts, source documents, and questions.",
      },
      expectations: {
        ...buildFixture().expectations,
        highStakesSafety: true,
        expectedGoalTerms: ["debt", "credit", "tracker"],
        expectedSkillThemes: ["organize", "financial"],
        expectedInventoryThemes: ["statement", "question"],
      },
    });
    const diagnostics = checkGeneratedAdventureContentQuality(content, fixture).diagnostics;

    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        area: "quest step quality",
        message: "side-quest-1.steps[0] should start from a concrete user action, decision, check, or artifact.",
      }),
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
