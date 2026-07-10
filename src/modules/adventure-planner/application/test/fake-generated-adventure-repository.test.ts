import { describe, expect, it } from "vitest";

import { parseGeneratedAdventure } from "../../domain/generated-adventure";
import { buildGeneratedAdventureBoundaryPayload } from "./generated-adventure-fixtures";
import { FakeGeneratedAdventureRepository } from "./fake-generated-adventure-repository";

describe("FakeGeneratedAdventureRepository", () => {
  it("saves, finds, and reuses generated adventures for the owning user", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });

    const saved = await repository.saveGeneratedAdventure({
      userId: "user-1",
      adventureId: "adventure-1",
      interviewOutputArtifactId: "artifact-1",
      adventure,
    });
    const duplicate = await repository.saveGeneratedAdventure({
      userId: "user-1",
      adventureId: "adventure-1",
      interviewOutputArtifactId: "artifact-1",
      adventure: parseGeneratedAdventure(
        buildGeneratedAdventureBoundaryPayload({ title: "Different Retry Title" }),
      ),
    });

    await expect(
      repository.findExistingGeneratedAdventure({ userId: "user-1", adventureId: "adventure-1" }),
    ).resolves.toEqual({
      adventureId: "adventure-1",
      generatedAdventureId: saved.generatedAdventureId,
      adventure,
    });
    expect(saved.reusedExistingAdventure).toBe(false);
    expect(duplicate).toEqual({ ...saved, reusedExistingAdventure: true });
  });

  it("hides generated adventures from non-owners and rejects non-owned saves", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    const adventure = parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
    repository.seedAdventure({ adventureId: "adventure-1", userId: "owner-user" });
    repository.seedGeneratedAdventure({
      userId: "owner-user",
      adventureId: "adventure-1",
      interviewOutputArtifactId: "artifact-1",
      adventure,
    });

    await expect(
      repository.findExistingGeneratedAdventure({ userId: "other-user", adventureId: "adventure-1" }),
    ).resolves.toBeNull();
    await expect(
      repository.saveGeneratedAdventure({
        userId: "other-user",
        adventureId: "adventure-1",
        interviewOutputArtifactId: "artifact-1",
        adventure,
      }),
    ).rejects.toThrow("Adventure was not found.");
  });
});
