import { describe, expect, it } from "vitest";

import type { InterviewTurnRequest, InterviewTurnResult } from "../application/start-adventure-interview/ports";
import {
  runGameMasterInterviewEvals,
  type GameMasterInterviewEvalFixture,
  type GameMasterInterviewEvalInterviewer,
} from "./run-game-master-interview-evals";

class CapturedStream {
  private chunks: string[] = [];

  write(chunk: string | Uint8Array): boolean {
    this.chunks.push(String(chunk));
    return true;
  }

  toString(): string {
    return this.chunks.join("");
  }
}

describe("runGameMasterInterviewEvals", () => {
  it("returns passed with injected fixtures and fake interviewer", async () => {
    const requests: InterviewTurnRequest[] = [];
    const result = await runGameMasterInterviewEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("become-a-chef")],
      loadInstructions: () => "test instructions",
      createInterviewer: ({ instructions }) => {
        expect(instructions).toBe("test instructions");
        return {
          async askNextQuestion(request) {
            requests.push(request);
            return passingInterviewResult();
          },
        } satisfies GameMasterInterviewEvalInterviewer;
      },
      output: new CapturedStream(),
      errorOutput: new CapturedStream(),
    });

    expect(result.status).toBe("passed");
    expect(result.fixtureIds).toEqual(["become-a-chef"]);
    expect(result.diagnostics).toEqual([]);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      userId: "eval-user-become-a-chef",
      adventureId: "eval-adventure-become-a-chef",
      goalText: "Become a confident home chef.",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
      transcript: [
        {
          id: "become-a-chef-1",
          role: "user",
          content: "I want to cook better dinners.",
          sequenceNumber: 1,
          createdAt: new Date(0),
        },
      ],
    });
  });

  it.each([
    {
      name: "missing OPENAI_API_KEY",
      environment: { NODE_ENV: "test", OPENAI_GAME_MASTER_MODEL: "gpt-test" },
      blocker: "missing_openai_api_key",
      message: "OPENAI_API_KEY is not configured",
    },
    {
      name: "placeholder OPENAI_API_KEY",
      environment: {
        NODE_ENV: "test",
        OPENAI_API_KEY: "replace-with-openai-key",
        OPENAI_GAME_MASTER_MODEL: "gpt-test",
      },
      blocker: "placeholder_openai_api_key",
      message: "OPENAI_API_KEY appears to be a placeholder value",
    },
    {
      name: "placeholder OPENAI_GAME_MASTER_MODEL",
      environment: {
        NODE_ENV: "test",
        OPENAI_API_KEY: "sk-test-local",
        OPENAI_GAME_MASTER_MODEL: "replace-with-model",
      },
      blocker: "placeholder_openai_game_master_model",
      message: "OPENAI_GAME_MASTER_MODEL appears to be a placeholder value",
    },
  ] as const)("returns blocked for $name before loading fixtures or interviewer", async (caseData) => {
    let fixtureLoadCount = 0;
    let instructionLoadCount = 0;
    let interviewerCreateCount = 0;
    const output = new CapturedStream();

    const result = await runGameMasterInterviewEvals({
      environment: caseData.environment,
      loadFixtures: () => {
        fixtureLoadCount += 1;
        return [buildFixture("blocked-fixture")];
      },
      loadInstructions: () => {
        instructionLoadCount += 1;
        return "test instructions";
      },
      createInterviewer: () => {
        interviewerCreateCount += 1;
        return fakeInterviewer(passingInterviewResult());
      },
      output,
      errorOutput: new CapturedStream(),
    });

    expect(result.status).toBe("blocked");
    if (result.status !== "blocked") {
      throw new Error(`Expected blocked result, received ${result.status}.`);
    }

    expect(result.blocker).toBe(caseData.blocker);
    expect(result.diagnostics[0].message).toBe(caseData.message);
    expect(result.diagnostics[0].message).not.toContain("replace-with-openai-key");
    expect(fixtureLoadCount).toBe(0);
    expect(instructionLoadCount).toBe(0);
    expect(interviewerCreateCount).toBe(0);
    expect(output.toString()).toContain("Game Master evals skipped");
  });

  it("returns failed for fixture expectation diagnostics", async () => {
    const errorOutput = new CapturedStream();
    const result = await runGameMasterInterviewEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("high-stakes-finance")],
      loadInstructions: () => "test instructions",
      createInterviewer: () => fakeInterviewer({
        ...passingInterviewResult(),
        coveredSignals: ["motivation"],
        messageToUser: "What result would make this worthwhile? What else should happen?",
      }),
      output: new CapturedStream(),
      errorOutput,
    });

    expect(result.status).toBe("failed");
    expect(result.diagnostics).toEqual([
      {
        fixtureId: "high-stakes-finance",
        message: "expected coveredSignals to include currentStage.",
      },
      {
        fixtureId: "high-stakes-finance",
        message: "expected exactly one question mark for one-question-at-a-time behavior, got 2.",
      },
    ]);
    expect(errorOutput.toString()).toContain("[high-stakes-finance]");
  });

  it("returns error for unexpected interviewer failures with safe diagnostics", async () => {
    const result = await runGameMasterInterviewEvals({
      environment: configuredEnvironment(),
      loadFixtures: () => [buildFixture("unsafe-error")],
      loadInstructions: () => "test instructions",
      createInterviewer: () => ({
        async askNextQuestion() {
          throw new Error(
            "provider response included raw transcript: I want to cook better dinners.",
          );
        },
      }),
      output: new CapturedStream(),
      errorOutput: new CapturedStream(),
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error(`Expected error result, received ${result.status}.`);
    }

    expect(result.fixtureIds).toEqual(["unsafe-error"]);
    expect(result.diagnostics[0]).toEqual({
      errorName: "Error",
      message: "Game Master eval runner error: Error: Unexpected eval runner failure.",
    });
    expect(result.diagnostics[0].message).not.toContain("I want to cook better dinners");
    expect(result.diagnostics[0].message).not.toContain("provider response");
  });
});

function configuredEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-test-local",
    OPENAI_GAME_MASTER_MODEL: "gpt-test",
  };
}

function buildFixture(id: string): GameMasterInterviewEvalFixture {
  return {
    id,
    name: "Fixture",
    goalText: "Become a confident home chef.",
    transcript: [
      {
        role: "user",
        content: "I want to cook better dinners.",
      },
    ],
    expectations: {
      requiredCoveredSignals: ["motivation", "currentStage"],
      mustAskOneQuestion: true,
      mustRemainNotReady: true,
      requiresCurrentStageBeforeReady: true,
      requiresExistingInventoryBeforeReady: false,
      highStakesSafety: false,
      requiresConcreteExamples: false,
      forbiddenQuestionPatterns: [],
    },
  };
}

function fakeInterviewer(result: InterviewTurnResult): GameMasterInterviewEvalInterviewer {
  return {
    async askNextQuestion() {
      return result;
    },
  };
}

function passingInterviewResult(): InterviewTurnResult {
  return {
    messageToUser: "Which dinner would you like to cook first?",
    readinessStatus: "not_ready",
    readinessConfirmation: "not_confirmed",
    coveredSignals: ["motivation", "currentStage"],
    summaryDelta: null,
  };
}
