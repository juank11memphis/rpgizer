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
