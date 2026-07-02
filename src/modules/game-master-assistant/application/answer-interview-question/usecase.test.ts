import { describe, expect, it } from "vitest";

import { answerInterviewQuestion } from "./usecase";
import {
  GameMasterInterviewerError,
  INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
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

  it("stores the User answer, stores the Game Master response, and updates readiness with lifecycle state", async () => {
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
      readinessConfirmation: "not_confirmed",
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
    expect(result.status).toBe("success");
    expect(result.draft.readinessStatus).toBe("ready_to_generate");
    expect(result.draft.interviewStatus).toBe("awaiting_confirmation");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("awaiting_confirmation");
    expect(result.transcript.map((message) => message.sequenceNumber)).toEqual([1, 2, 3, 4]);
  });

  it("accepts final context while awaiting confirmation and can continue interviewing", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content:
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      sequenceNumber: 1,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "That changes the route. What budget should we plan around?",
      readinessStatus: "not_ready",
      readinessConfirmation: "not_confirmed",
    });

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        answerText: "I forgot to mention my budget is very limited.",
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.status).toBe("success");
    expect(result.draft.readinessStatus).toBe("not_ready");
    expect(result.draft.interviewStatus).toBe("interviewing");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("interviewing");
    expect(interviewer.requests[0]).toMatchObject({
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    expect(interviewer.requests[0]?.transcript.map((message) => [message.role, message.content])).toEqual([
      [
        "game_master",
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      ],
      ["user", "I forgot to mention my budget is very limited."],
    ]);
  });

  it("accepts final context while awaiting confirmation and can ask for confirmation again", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content:
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      sequenceNumber: 1,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser:
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      readinessStatus: "ready_to_generate",
      readinessConfirmation: "not_confirmed",
    });

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        answerText: "I prefer vegetarian recipes.",
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.status).toBe("success");
    expect(result.draft.readinessStatus).toBe("ready_to_generate");
    expect(result.draft.interviewStatus).toBe("awaiting_confirmation");
    expect(repository.getStoredTranscript("adventure-1").map((message) => [message.role, message.content])).toEqual([
      [
        "game_master",
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      ],
      ["user", "I prefer vegetarian recipes."],
      [
        "game_master",
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      ],
    ]);
  });


  it("confirms readiness when awaiting confirmation and the User says they are good", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content:
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      sequenceNumber: 1,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "Great — I’ll forge from here.",
      readinessStatus: "ready_to_generate",
      readinessConfirmation: "confirmed",
    });

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        answerText: "I am good",
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.status).toBe("success");
    expect(result.draft.interviewStatus).toBe("confirmed");
    expect(result.draft.readinessStatus).toBe("ready_to_generate");
    expect(result.transcript.map((message) => [message.role, message.content])).toEqual([
      [
        "game_master",
        "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      ],
      ["user", "I am good"],
    ]);
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("confirmed");
    expect(repository.appendedMessages.map((message) => message.role)).toEqual(["user"]);
    expect(interviewer.requests[0]).toMatchObject({
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
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
      readinessConfirmation: "not_confirmed",
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

  it("returns recoverable state with the preserved User answer when provider fails", async () => {
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

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        answerText: "I can cook eggs and pasta.",
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(repository.getStoredTranscript("adventure-1").map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What is your current cooking level?"],
      ["user", "I can cook eggs and pasta."],
    ]);
    expect(result).toMatchObject({
      status: "recoverable_failure",
      message: INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
      preservedUserMessage: {
        role: "user",
        content: "I can cook eggs and pasta.",
      },
    });
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("not_ready");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("interviewing");
  });

  it("retries a preserved User answer without appending a duplicate User message", async () => {
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
    const preservedUserMessage = repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "I can cook eggs and pasta.",
      sequenceNumber: 3,
    });
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "Great. What tools and time do you already have?",
      readinessStatus: "not_ready",
      readinessConfirmation: "not_confirmed",
    });

    const result = await answerInterviewQuestion(
      {
        userId: "user-1",
        adventureId: "adventure-1",
        retryUserMessageId: preservedUserMessage.id,
      },
      { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
    );

    expect(result.status).toBe("success");
    expect(result.draft.interviewStatus).toBe("interviewing");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("interviewing");
    expect(repository.appendedMessages.map((message) => [message.role, message.content])).toEqual([
      ["game_master", "Great. What tools and time do you already have?"],
    ]);
    expect(interviewer.requests[0]?.transcript.map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What is your current cooking level?"],
      ["user", "I can cook eggs and pasta."],
    ]);
    expect(repository.getStoredTranscript("adventure-1").map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What is your current cooking level?"],
      ["user", "I can cook eggs and pasta."],
      ["game_master", "Great. What tools and time do you already have?"],
    ]);
  });

  it("rejects invalid retry metadata before appending or calling the interviewer", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "What is your current cooking level?",
      sequenceNumber: 1,
    });
    const interviewer = new FakeGameMasterInterviewer();

    await expect(
      answerInterviewQuestion(
        {
          userId: "user-1",
          adventureId: "adventure-1",
          retryUserMessageId: "missing-message",
        },
        { adventureDraftRepository: repository, gameMasterInterviewer: interviewer },
      ),
    ).rejects.toThrow("Saved answer was not found.");

    expect(repository.appendedMessages).toEqual([]);
    expect(interviewer.requests).toEqual([]);
  });
});
