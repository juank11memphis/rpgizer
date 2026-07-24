import { describe, expect, it, vi } from "vitest";

import { FakeGeneratedAdventureRepository } from "../application/test/fake-generated-adventure-repository";
import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { validInterviewOutputArtifact } from "../../game-master-assistant/application/test/fake-interview-output-artifact-generator";
import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import { parseGeneratedAdventureXpBalance } from "../domain/generated-adventure-xp";
import { createAdventurePlannerComposition } from "./adventure-planner-composition";

describe("createAdventurePlannerComposition", () => {
  it("exposes injectable persistence and step adapters for forge orchestration", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const content = parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
    const dependencyLinks = parseGeneratedAdventureDependencyLinks(
      buildGeneratedAdventureDependencyLinksBoundaryPayload(),
      content,
    );
    const xpBalance = parseGeneratedAdventureXpBalance(
      buildGeneratedAdventureXpBalanceBoundaryPayload(),
      dependencyLinks,
    );
    const contentGenerator = { generateAdventureContent: vi.fn().mockResolvedValue(content) };
    const dependencyLinker = { linkAdventureDependencies: vi.fn().mockResolvedValue(dependencyLinks) };
    const xpBalancer = { balanceAdventureXp: vi.fn().mockResolvedValue(xpBalance) };
    const composition = createAdventurePlannerComposition({
      generatedAdventureRepository: repository,
      contentGenerator,
      dependencyLinker,
      xpBalancer,
    });

    const generatedContent = await composition.generateAdventureContent({
      userId: "user-1",
      adventureId: "adventure-1",
      goalText: "Become a chef",
      transcript: [],
      interviewOutputArtifactId: "artifact-1",
      interviewOutputArtifact: validInterviewOutputArtifact(),
    });
    const generatedLinks = await composition.linkAdventureDependencies(generatedContent);
    const generatedXp = await composition.balanceAdventureXp(generatedContent, generatedLinks);

    expect(generatedContent).toBe(content);
    expect(generatedLinks).toBe(dependencyLinks);
    expect(generatedXp).toBe(xpBalance);
    expect(await composition.findExistingGeneratedAdventure({ userId: "user-1", adventureId: "adventure-1" })).toBeNull();
    expect(contentGenerator.generateAdventureContent).toHaveBeenCalledTimes(1);
  });
});
