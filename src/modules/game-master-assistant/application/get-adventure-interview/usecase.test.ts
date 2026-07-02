import { describe, expect, it } from "vitest";

import { getAdventureInterview } from "./usecase";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";

describe("getAdventureInterview", () => {
  it("returns null for a draft that is not owned by the User", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "owner-user",
      goalText: "Become a chef",
    });

    await expect(
      getAdventureInterview(
        { userId: "other-user", adventureId: "adventure-1" },
        { adventureDraftRepository: repository },
      ),
    ).resolves.toEqual({ interview: null });
  });

  it("returns the authorized draft transcript in stable sequence order", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "What is your current skill level?",
      sequenceNumber: 2,
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "Become a chef",
      sequenceNumber: 1,
    });

    const result = await getAdventureInterview(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository },
    );

    expect(result.interview?.draft).toMatchObject({
      id: "adventure-1",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
      interviewStatus: "interviewing",
    });
    expect(result.interview?.transcript.map((message) => message.sequenceNumber)).toEqual([
      1, 2,
    ]);
  });
});
