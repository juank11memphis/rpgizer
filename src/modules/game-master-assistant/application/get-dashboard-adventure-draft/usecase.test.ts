import { describe, expect, it } from "vitest";

import { getDashboardAdventureDraft } from "./usecase";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";

describe("getDashboardAdventureDraft", () => {
  it("returns null when the User has no active draft", async () => {
    const repository = new FakeAdventureDraftRepository();

    await expect(
      getDashboardAdventureDraft(
        { userId: "user-1" },
        { adventureDraftRepository: repository },
      ),
    ).resolves.toEqual({ draft: null });
  });

  it("returns the current User's active draft summary", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "older-draft",
      userId: "user-1",
      goalText: "Learn guitar",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    repository.seedDraft({
      id: "newer-draft",
      userId: "user-1",
      goalText: "Become a chef",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    repository.seedDraft({
      id: "other-user-draft",
      userId: "user-2",
      goalText: "Run a marathon",
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    });

    const result = await getDashboardAdventureDraft(
      { userId: "user-1" },
      { adventureDraftRepository: repository },
    );

    expect(result.draft).toMatchObject({
      id: "newer-draft",
      goalText: "Become a chef",
      state: "drafting",
      readinessStatus: "not_ready",
    });
  });
});
