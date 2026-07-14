import { describe, expect, it } from "vitest";

import { validInterviewOutputArtifact } from "../../game-master-assistant/application/test/fake-interview-output-artifact-generator";
import { FakeAdventureGenerator, validGeneratedAdventure } from "../application/test/fake-adventure-generator";
import { FakeGeneratedAdventureRepository } from "../application/test/fake-generated-adventure-repository";
import { createAdventurePlannerComposition } from "./adventure-planner-composition";
import { OpenAIMultiStepAdventureGenerator } from "./openai-multi-step-adventure-generator";

describe("createAdventurePlannerComposition", () => {
  it("delegates generation through injectable application dependencies", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const generator = new FakeAdventureGenerator();
    generator.queueAdventure(validGeneratedAdventure());
    const composition = createAdventurePlannerComposition({
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    const result = await composition.generateAdventure({
      userId: "user-1",
      adventureId: "adventure-1",
      goalText: "Become a chef",
      transcript: [],
      interviewOutputArtifactId: "artifact-1",
      interviewOutputArtifact: validInterviewOutputArtifact(),
    });

    expect(result).toMatchObject({
      status: "ready",
      generatedAdventureId: "generated-adventure-1",
      reusedExistingAdventure: false,
    });
    expect(generator.requests).toHaveLength(1);
  });

  it("uses the multi-step OpenAI generator by default", () => {
    process.env.OPENAI_API_KEY = "sk-test";

    try {
      const composition = createAdventurePlannerComposition();

      expect(composition.createAdventureGenerator()).toBeInstanceOf(OpenAIMultiStepAdventureGenerator);
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });

});
