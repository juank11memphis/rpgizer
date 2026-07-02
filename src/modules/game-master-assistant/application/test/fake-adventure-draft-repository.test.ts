import { describe, expect, it } from "vitest";

import { FakeAdventureDraftRepository } from "./fake-adventure-draft-repository";

describe("FakeAdventureDraftRepository", () => {
  it("rejects unauthorized writes without changing transcript, readiness, or lifecycle state", async () => {
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

    await expect(
      repository.appendInterviewMessage({
        userId: "other-user",
        adventureId: "adventure-1",
        role: "user",
        content: "I can cook eggs and pasta.",
      }),
    ).rejects.toThrow("Adventure draft was not found.");

    await expect(
      repository.updateReadiness({
        userId: "other-user",
        adventureId: "adventure-1",
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
      }),
    ).rejects.toThrow("Adventure draft was not found.");

    expect(repository.getStoredTranscript("adventure-1").map((message) => message.content)).toEqual([
      "Become a chef",
    ]);
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("not_ready");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("interviewing");
    expect(repository.appendedMessages).toEqual([]);
  });
});
