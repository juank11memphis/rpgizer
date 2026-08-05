import { describe, expect, it } from "vitest";

import type { InterviewTurnResult } from "../../application/start-adventure-interview/ports";
import { checkGameMasterInterviewEvalAssertions } from "./game-master-interview-eval-checks";
import type { GameMasterInterviewEvalFixture } from "./game-master-interview-eval-types";

describe("checkGameMasterInterviewEvalAssertions", () => {
  it("distinguishes known covered signals from the signal being asked next", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredCoveredSignals: ["existingInventory"],
        requiredUncoveredSignals: ["likelyMissingResources"],
        requiredQuestionTargets: ["likelyMissingResources"],
      }),
      buildResult({
        messageToUser:
          "Do you still need any support, ingredients, serving dishes, or equipment for the dinner?",
        coveredSignals: ["existingInventory"],
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        { id: "covered-signal-existingInventory", label: "covers existingInventory", status: "passed" },
        {
          id: "uncovered-signal-likelyMissingResources",
          label: "keeps likelyMissingResources uncovered",
          status: "passed",
        },
        {
          id: "question-target-likelyMissingResources",
          label: "asks about likelyMissingResources",
          status: "passed",
        },
      ]),
    );
  });

  it("fails when a next-question target is prematurely marked covered", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredCoveredSignals: ["existingInventory"],
        requiredUncoveredSignals: ["likelyMissingResources"],
        requiredQuestionTargets: ["likelyMissingResources"],
      }),
      buildResult({
        messageToUser: "Do you still need a mentor, class, or better equipment?",
        coveredSignals: ["existingInventory", "likelyMissingResources"],
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "uncovered-signal-likelyMissingResources",
          label: "keeps likelyMissingResources uncovered",
          status: "failed",
          message: "expected coveredSignals not to include likelyMissingResources.",
        },
      ]),
    );
  });

  it("recognizes natural past friction wording in the next question", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredUncoveredSignals: ["pastFriction"],
        requiredQuestionTargets: ["pastFriction"],
      }),
      buildResult({
        messageToUser:
          "You’ve got a solid starter kit. What’s been the biggest snag so far: sticking to the routine, remembering vocab, speaking out loud, or finding the right practice balance?",
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "question-target-pastFriction",
          label: "asks about pastFriction",
          status: "passed",
        },
      ]),
    );
  });

  it("recognizes off-track past friction wording in the next question", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredUncoveredSignals: ["pastFriction"],
        requiredQuestionTargets: ["pastFriction"],
      }),
      buildResult({
        messageToUser:
          "You’ve got a solid kit already. What’s the biggest thing that usually throws you off track: motivation dips, forgetting to study, not enough time, getting overwhelmed, or something else?",
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "question-target-pastFriction",
          label: "asks about pastFriction",
          status: "passed",
        },
      ]),
    );
  });

  it("recognizes trip-up wording as a past friction question", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredUncoveredSignals: ["pastFriction"],
        requiredQuestionTargets: ["pastFriction"],
      }),
      buildResult({
        messageToUser:
          "Nice, you’ve got a solid starter kit. What’s most likely to trip you up here: consistency, speaking anxiety, grammar overload, or something else?",
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "question-target-pastFriction",
          label: "asks about pastFriction",
          status: "passed",
        },
      ]),
    );
  });

  it("recognizes target-shape wording as a success definition question", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredUncoveredSignals: ["successDefinition"],
        requiredQuestionTargets: ["successDefinition"],
      }),
      buildResult({
        messageToUser:
          "Nice, we’ve got the quest title—what kind of chef path fits best: cooking impressive meals at home, working in a restaurant kitchen, catering/events, starting a food business, or something else?",
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "question-target-successDefinition",
          label: "asks about successDefinition",
          status: "passed",
        },
      ]),
    );
  });

  it("recognizes deeper readiness signal targets", () => {
    const cases = [
      ["preferences", "Which cooking style sounds most appealing: bright Mediterranean meals, cozy soups, quick stir-fries, or something else?"],
      ["dislikesOrAvoidances", "What should this Adventure avoid: spicy food, long grammar drills, expensive tools, or something else?"],
      ["confidenceGaps", "Where do you feel least confident right now: knife skills, timing, shopping, or cleanup?"],
      ["examplesOrInspirations", "For example, what is one meal, chef, video, or restaurant that feels inspiring as a reference?"],
      ["firstMilestoneReadiness", "What first milestone would feel useful and safe: one weeknight dinner, a practice conversation, or a budget review?"],
      ["goalTypeSpecificBasics", "Which cuisine basics should we calibrate around: Mediterranean, Japanese, vegetarian, or something else?"],
    ] as const;

    for (const [signal, messageToUser] of cases) {
      const assertions = checkGameMasterInterviewEvalAssertions(
        buildFixture({
          requiredUncoveredSignals: [signal],
          requiredQuestionTargets: [signal],
          requiresConcreteExamples: true,
        }),
        buildResult({ messageToUser }),
      );

      expect(assertions).toEqual(
        expect.arrayContaining([
          { id: `question-target-${signal}`, label: `asks about ${signal}`, status: "passed" },
          { id: "concrete-question-support", label: "includes concrete examples or answer shapes", status: "passed" },
        ]),
      );
    }
  });

  it("fails premature readiness when a deeper signal is still expected uncovered", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({
        requiredUncoveredSignals: ["confidenceGaps"],
        mustRemainNotReady: true,
      }),
      buildResult({
        messageToUser: "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
        readinessStatus: "ready_to_generate",
        coveredSignals: ["confidenceGaps"],
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "uncovered-signal-confidenceGaps",
          label: "keeps confidenceGaps uncovered",
          status: "failed",
          message: "expected coveredSignals not to include confidenceGaps.",
        },
        {
          id: "remains-not-ready",
          label: "remains not ready",
          status: "failed",
          message: "expected readinessStatus to remain not_ready.",
        },
      ]),
    );
  });

  it("recognizes ready but not confirmed final confirmation", () => {
    const assertions = checkGameMasterInterviewEvalAssertions(
      buildFixture({ mustAskFinalConfirmation: true, mustRemainNotReady: false }),
      buildResult({
        messageToUser: "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
        readinessStatus: "ready_to_generate",
        readinessConfirmation: "not_confirmed",
      }),
    );

    expect(assertions).toEqual(
      expect.arrayContaining([
        {
          id: "final-confirmation-question",
          label: "asks final confirmation after readiness",
          status: "passed",
        },
      ]),
    );
  });

});

function buildFixture(
  expectationOverrides: Partial<GameMasterInterviewEvalFixture["expectations"]>,
): GameMasterInterviewEvalFixture {
  return {
    id: "fixture-1",
    name: "Fixture",
    goalText: "Become a chef",
    expectations: {
      requiredCoveredSignals: [],
      requiredUncoveredSignals: [],
      requiredQuestionTargets: [],
      mustAskOneQuestion: false,
      mustRemainNotReady: false,
      requiresCurrentStageBeforeReady: false,
      requiresExistingInventoryBeforeReady: false,
      highStakesSafety: false,
      requiresConcreteExamples: false,
      mustAskFinalConfirmation: false,
      forbiddenQuestionPatterns: [],
      ...expectationOverrides,
    },
    transcript: [{ role: "user", content: "I want to become a chef." }],
  };
}

function buildResult(overrides: Partial<InterviewTurnResult>): InterviewTurnResult {
  return {
    messageToUser: "What do you need?",
    readinessStatus: "not_ready",
    readinessConfirmation: "not_confirmed",
    coveredSignals: [],
    summaryDelta: null,
    ...overrides,
  };
}
