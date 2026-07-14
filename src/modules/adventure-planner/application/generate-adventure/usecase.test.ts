import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { FakeAdventureGenerator, validGeneratedAdventure } from "../test/fake-adventure-generator";
import { FakeGeneratedAdventureRepository } from "../test/fake-generated-adventure-repository";
import { AdventureGeneratorError, ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE } from "./ports";
import { generateAdventure } from "./usecase";
import { validInterviewOutputArtifact } from "../../../game-master-assistant/application/test/fake-interview-output-artifact-generator";

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../../server/logging/logger", () => ({
  serverLogger: loggerMock,
}));

const input = {
  userId: "user-1",
  adventureId: "adventure-1",
  goalText: "Become a chef",
  transcript: [
    {
      id: "message-1",
      role: "user" as const,
      content: "Become a chef",
      sequenceNumber: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
  interviewOutputArtifactId: "artifact-1",
  interviewOutputArtifact: validInterviewOutputArtifact(),
};

describe("generateAdventure", () => {
  beforeEach(() => {
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
  });

  it("generates, persists, and returns a ready generated Adventure", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const generator = new FakeAdventureGenerator();
    generator.queueAdventure(validGeneratedAdventure());

    const result = await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(result).toMatchObject({
      status: "ready",
      adventureId: "adventure-1",
      generatedAdventureId: "generated-adventure-1",
      reusedExistingAdventure: false,
    });
    expect(generator.requests).toHaveLength(1);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_COMPLETED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_COMPLETED,
        result: "success",
        generatedAdventureId: "generated-adventure-1",
        reusedExistingAdventure: false,
        actCount: 1,
        questCount: 2,
        bossFightCount: 1,
        skillCount: 2,
        inventoryItemCount: 2,
        achievementCount: 1,
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("reuses an existing generated Adventure without calling the generator", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    repository.seedGeneratedAdventure({
      userId: "user-1",
      adventureId: "adventure-1",
      interviewOutputArtifactId: "artifact-1",
      generatedAdventureId: "generated-existing",
      adventure: validGeneratedAdventure(),
    });
    const generator = new FakeAdventureGenerator();

    const result = await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(result).toMatchObject({
      status: "ready",
      generatedAdventureId: "generated-existing",
      reusedExistingAdventure: true,
    });
    expect(generator.requests).toEqual([]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_REUSED_EXISTING)).toHaveLength(1);
  });

  it("returns a safe recoverable failure for provider errors", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const generator = new FakeAdventureGenerator();
    generator.queueError(new AdventureGeneratorError("provider_request_failed", "secret provider detail"));

    const result = await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(result).toEqual({
      status: "recoverable_failure",
      message: ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE,
    });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE)).toEqual([
      expect.objectContaining({
        result: "recoverable_failure",
        resultCategory: "provider_request_failed",
      }),
    ]);
  });

  it("returns a safe recoverable failure for persistence errors", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    const generator = new FakeAdventureGenerator();
    generator.queueAdventure(validGeneratedAdventure());

    const result = await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(result).toEqual({
      status: "recoverable_failure",
      message: ADVENTURE_GENERATOR_FAILURE_USER_MESSAGE,
    });
  });

  it("persists the exact final Adventure returned by the generator", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const finalAdventure = validGeneratedAdventure();
    const generator = new FakeAdventureGenerator();
    generator.queueAdventure(finalAdventure);

    await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(repository.saveGeneratedAdventureInputs).toEqual([
      expect.objectContaining({
        userId: "user-1",
        adventureId: "adventure-1",
        interviewOutputArtifactId: "artifact-1",
        adventure: finalAdventure,
      }),
    ]);
  });

  it("does not persist when Adventure generation fails before a final Adventure exists", async () => {
    const repository = new FakeGeneratedAdventureRepository();
    repository.seedAdventure({ adventureId: "adventure-1", userId: "user-1" });
    const generator = new FakeAdventureGenerator();
    generator.queueError(new AdventureGeneratorError("provider_output_invalid", "generation failed"));

    await generateAdventure(input, {
      generatedAdventureRepository: repository,
      adventureGenerator: generator,
    });

    expect(repository.saveGeneratedAdventureInputs).toEqual([]);
  });

});

function infoPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.info.mock.calls
    .map(([payload]) => payload as Record<string, unknown>)
    .filter((payload) => payload["event"] === event);
}

function warnPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.warn.mock.calls
    .map(([payload]) => payload as Record<string, unknown>)
    .filter((payload) => payload["event"] === event);
}
