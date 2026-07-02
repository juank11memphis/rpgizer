import { describe, expect, it } from "vitest";

import { startAdventureInterview } from "./usecase";
import {
  GameMasterInterviewerError,
  INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
  InterviewProviderFailure,
} from "./provider-error";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import { FakeGameMasterInterviewer } from "../test/fake-game-master-interviewer";

describe("startAdventureInterview", () => {
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
