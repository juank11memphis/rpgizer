import { describe, expect, it } from "vitest";

import { FakeAdventureDraftRepository } from "../application/test/fake-adventure-draft-repository";
import { FakeGameMasterInterviewer } from "../application/test/fake-game-master-interviewer";
import {
  FakeInterviewOutputArtifactGenerator,
  validInterviewOutputArtifact,
} from "../application/test/fake-interview-output-artifact-generator";
import { createGameMasterAssistantProduction } from "./game-master-assistant-production";

describe("createGameMasterAssistantProduction", () => {
  it("wires start Adventure interview through the production composition seam", async () => {
    const repository = new FakeAdventureDraftRepository();
    const interviewer = new FakeGameMasterInterviewer();
    interviewer.queueResult({
      messageToUser: "What does victory look like for this Adventure?",
      readinessStatus: "ready_to_generate",
    });
    const production = createGameMasterAssistantProduction({
      adventureDraftRepository: repository,
      gameMasterInterviewer: interviewer,
    });

    const result = await production.startAdventureInterview({
      userId: "user-1",
      goalText: "Become a chef",
    });

    expect(interviewer.requests).toHaveLength(1);
    expect(result.draft).toEqual({
      id: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("ready_to_generate");
    expect(repository.getStoredInterviewStatus("adventure-1")).toBe("awaiting_confirmation");
    expect(result.transcript.map((message) => [message.role, message.content])).toEqual([
      ["user", "Become a chef"],
      ["game_master", "What does victory look like for this Adventure?"],
    ]);
  });

  it("wires answer interview through the same real interviewer port and preserves fakes for tests", async () => {
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
      messageToUser: "What ingredients, tools, and time do you already have?",
      readinessStatus: "ready_to_generate",
    });
    const production = createGameMasterAssistantProduction({
      adventureDraftRepository: repository,
      gameMasterInterviewer: interviewer,
    });

    const result = await production.answerInterviewQuestion({
      userId: "user-1",
      adventureId: "adventure-1",
      answerText: "I can cook eggs and pasta.",
    });

    expect(interviewer.requests).toHaveLength(1);
    expect(interviewer.requests[0]?.transcript.map((message) => message.content)).toEqual([
      "Become a chef",
      "What is your current cooking level?",
      "I can cook eggs and pasta.",
    ]);
    expect(repository.getStoredDraftReadiness("adventure-1")).toBe("ready_to_generate");
    expect(result.transcript.at(-1)).toMatchObject({
      role: "game_master",
      content: "What ingredients, tools, and time do you already have?",
    });
  });

  it("exposes read use cases from the production composition seam", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
    });
    const production = createGameMasterAssistantProduction({
      adventureDraftRepository: repository,
      gameMasterInterviewer: new FakeGameMasterInterviewer(),
    });

    await expect(
      production.getDashboardAdventureDraft({ userId: "user-1" }),
    ).resolves.toMatchObject({ draft: { id: "adventure-1" } });
    await expect(
      production.getAdventureInterview({ userId: "user-1", adventureId: "adventure-1" }),
    ).resolves.toMatchObject({ interview: { draft: { id: "adventure-1" } } });
  });

  it("wires interview output artifact generation through injectable production dependencies", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
    });
    const generator = new FakeInterviewOutputArtifactGenerator();
    generator.queueArtifact(validInterviewOutputArtifact());
    const production = createGameMasterAssistantProduction({
      adventureDraftRepository: repository,
      gameMasterInterviewer: new FakeGameMasterInterviewer(),
      interviewOutputArtifactGenerator: generator,
    });

    const result = await production.generateInterviewOutputArtifact({
      userId: "user-1",
      adventureId: "adventure-1",
    });

    expect(result).toMatchObject({
      status: "ready",
      reusedExistingArtifact: false,
    });
    expect(generator.requests).toHaveLength(1);
    expect(repository.savedArtifacts).toHaveLength(1);
  });
});
