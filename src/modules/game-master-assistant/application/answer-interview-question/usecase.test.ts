import { describe, expect, it } from "vitest";

import { answerInterviewQuestion } from "./usecase";
import {
  GameMasterInterviewerError,
  INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
  InterviewProviderFailure,
} from "../start-adventure-interview/provider-error";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import { FakeGameMasterInterviewer } from "../test/fake-game-master-interviewer";

describe("answerInterviewQuestion", () => {
  it("rejects a blank answer", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();

    await expect(
      answerInterviewQuestion(
        { userId: "user-1", adventureId: "adventure-1", answerText: " " },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Answer must not be blank.");
  });

  it("stores the User answer, stores the Game Master response, and updates readiness", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "Become a chef",
      sequenceNumber: 1,
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "What is your current cooking level?",
      sequenceNumber: 2,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "Great. What tools and time do you already have?",
      readinessStatus: "ready_to_generate",
    });

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        answerText: " I can cook eggs and pasta. ",
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(repository.appendedMessages.map((message) => [message.role, message.content])).toEqual([
      ["user", "I can cook eggs and pasta."],
      ["game_master", "Great. What tools and time do you already have?"],
    ]);
    expect(interviewer.requests[0]?.transcript.map((message) => message.content)).toEqual([
      "Become a chef",
      "What is your current cooking level?",
      "I can cook eggs and pasta.",
    ]);
    expect(result.draft.readinessStatus).toBe("ready_to_generate");
    expect(result.transcript.map((message) => message.sequenceNumber)).toEqual([1, 2, 3, 4]);
  });

  it("rejects a missing draft with a generic not-found error", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();

    await expect(
      answerInterviewQuestion(
        {
          userId: "user-1",
          adventureId: "missing-adventure",
          answerText: "I can cook eggs and pasta.",
        },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Adventure draft was not found.");

    expect(repository.appendedMessages).toEqual([]);
    expect(interviewer.requests).toEqual([]);
  });

  it("rejects another User's draft before mutation or interviewer call", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "owner-user",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "Become a chef",
      sequenceNumber: 1,
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "What is your current cooking level?",
      sequenceNumber: 2,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "Great. What tools and time do you already have?",
      readinessStatus: "ready_to_generate",
    });

    await expect(
      answerInterviewQuestion(
        {
          userId: "other-user",
          adventureId: "adventure-1",
          answerText: "I can cook eggs and pasta.",
        },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Adventure draft was not found.");

    expect(repository.getStoredTranscript("adventure-1").map((message) => message.content)).toEqual([
      "Become a chef",
      "What is your current cooking level?",
    ]);
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("not_ready");
    expect(repository.appendedMessages).toEqual([]);
    expect(interviewer.requests).toEqual([]);
  });

  it("preserves the User answer and avoids appending a Game Master message when provider fails", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "not_ready",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "Become a chef",
      sequenceNumber: 1,
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "What is your current cooking level?",
      sequenceNumber: 2,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueError(
      new GameMasterInterviewerError(
        "provider_output_invalid",
        "raw invalid structured output detail",
      ),
    );

    await expect(
      answerInterviewQuestion(
        {
          userId: "user-1",
          adventureId: "adventure-1",
          answerText: "I can cook eggs and pasta.",
        },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toMatchObject({
      name: "InterviewProviderFailure",
      code: "provider_output_invalid",
      message: INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
      userMessage: INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
    } satisfies Partial<InterviewProviderFailure>);

    expect(repository.getStoredTranscript("adventure-1").map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What is your current cooking level?"],
      ["user", "I can cook eggs and pasta."],
    ]);
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("not_ready");
  });
});
