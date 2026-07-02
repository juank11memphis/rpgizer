import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { startAdventureInterview } from "./usecase";
import {
  GameMasterInterviewerError,
  INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
  InterviewProviderFailure,
} from "./provider-error";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import { FakeGameMasterInterviewer } from "../test/fake-game-master-interviewer";

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
}));

vi.mock("../../../../server/logging/logger", () => ({
  serverLogger: {
    info: loggerMock.info,
  },
}));

describe("startAdventureInterview", () => {
  beforeEach(() => {
    loggerMock.info.mockClear();
  });

  it("rejects a blank Goal", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();

    await expect(
      startAdventureInterview(
        { userId: "user-1", goalText: "   " },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Goal must not be blank.");
  });

  it("creates a drafting Adventure with the initial User goal and Game Master question", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "What makes becoming a chef meaningful right now?",
      readinessStatus: "not_ready",
      readinessConfirmation: "not_confirmed",
    });

    const result = await startAdventureInterview(
      { userId: "user-1", goalText: "  Become a chef  " },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.draft).toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
    });
    expect(result.transcript.map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What makes becoming a chef meaningful right now?"],
    ]);
    expect(interviewer.requests[0]).toMatchObject({
      userId: "user-1",
      adventureId: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
    });
    expect(interviewer.requests[0]?.transcript.map((message) => message.content)).toEqual([
      "Become a chef",
    ]);
    expect(logPayloadsFor(APPLICATION_LOG_EVENTS.ADVENTURE_DRAFT_CREATE_SUCCESS)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.ADVENTURE_DRAFT_CREATE_SUCCESS,
        flow: "adventure_creation",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        readinessStatus: "not_ready",
        interviewStatus: "interviewing",
      }),
    ]);
    expect(logPayloadsFor(APPLICATION_LOG_EVENTS.INTERVIEW_TURN_COMPLETED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.INTERVIEW_TURN_COMPLETED,
        flow: "interview",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        readinessStatus: "not_ready",
        interviewStatus: "interviewing",
        durationMs: expect.any(Number),
      }),
    ]);
    expect(logPayloadsFor(APPLICATION_LOG_EVENTS.INTERVIEW_READINESS_CHANGED)).toEqual([]);
    expect(serializedLogPayloads()).not.toContain("Become a chef");
    expect(serializedLogPayloads()).not.toContain(
      "What makes becoming a chef meaningful right now?",
    );
  });

  it("persists ready_to_generate when the first interviewer response says the draft is ready", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "I have what I need to shape this Adventure.",
      readinessStatus: "ready_to_generate",
      readinessConfirmation: "not_confirmed",
    });

    const result = await startAdventureInterview(
      { userId: "user-1", goalText: "Become a chef" },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.draft.readinessStatus).toBe("ready_to_generate");
    expect(result.draft.interviewStatus).toBe("awaiting_confirmation");
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("ready_to_generate");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("awaiting_confirmation");
    expect(logPayloadsFor(APPLICATION_LOG_EVENTS.INTERVIEW_READINESS_CHANGED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.INTERVIEW_READINESS_CHANGED,
        flow: "interview",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        previousReadinessStatus: "not_ready",
        nextReadinessStatus: "ready_to_generate",
        previousInterviewStatus: "interviewing",
        nextInterviewStatus: "awaiting_confirmation",
      }),
    ]);
  });

  it("normalizes provider failures without exposing provider internals", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueError(
      new GameMasterInterviewerError(
        "provider_request_failed",
        "401 raw provider detail",
      ),
    );

    await expect(
      startAdventureInterview(
        { userId: "user-1", goalText: "Become a chef" },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toMatchObject({
      name: "InterviewProviderFailure",
      code: "provider_request_failed",
      message: INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
      userMessage: INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
    } satisfies Partial<InterviewProviderFailure>);

    expect(repository.getStoredTranscript("adventure-1").map((message) => message.content)).toEqual([
      "Become a chef",
    ]);
  });
});

function logPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.info.mock.calls
    .map(([payload]) => payload)
    .filter(
      (payload): payload is Record<string, unknown> =>
        typeof payload === "object" &&
        payload !== null &&
        "event" in payload &&
        payload.event === event,
    );
}

function serializedLogPayloads(): string {
  return JSON.stringify(loggerMock.info.mock.calls.map(([payload]) => payload));
}
