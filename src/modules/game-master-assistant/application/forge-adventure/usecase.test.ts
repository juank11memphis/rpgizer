import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import { validGeneratedAdventure } from "../../../adventure-planner/application/test/fake-adventure-generator";
import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import {
  FakeInterviewOutputArtifactGenerator,
  validInterviewOutputArtifact,
} from "../test/fake-interview-output-artifact-generator";
import { forgeAdventure } from "./usecase";

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../../server/logging/logger", () => ({
  serverLogger: loggerMock,
}));

const confirmedDraft = {
  id: "adventure-1",
  userId: "user-1",
  goalText: "Become a chef",
  readinessStatus: "ready_to_generate" as const,
  interviewStatus: "confirmed" as const,
};

describe("forgeAdventure", () => {
  beforeEach(() => {
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
  });

  it("creates an artifact, calls Adventure Planner, and returns ready", async () => {
    const repository = seedConfirmedRepository();
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    artifactGenerator.queueArtifact(validInterviewOutputArtifact());
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toEqual({
      status: "ready",
      adventureId: "adventure-1",
      artifactId: "artifact-1",
      generatedAdventureId: "generated-adventure-1",
      reusedExistingArtifact: false,
      reusedExistingAdventure: false,
    });
    expect(adventurePlanner.requests).toEqual([
      expect.objectContaining({
        userId: "user-1",
        adventureId: "adventure-1",
        goalText: "Become a chef",
        interviewOutputArtifactId: "artifact-1",
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_ARTIFACT_CREATED)).toHaveLength(1);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_COMPLETED)).toEqual([
      expect.objectContaining({
        result: "success",
        generatedAdventureId: "generated-adventure-1",
        reusedExistingArtifact: false,
        reusedExistingAdventure: false,
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("reuses an existing artifact and generated Adventure", async () => {
    const repository = seedConfirmedRepository();
    repository.seedCurrentArtifact({
      adventureId: "adventure-1",
      id: "artifact-existing",
      artifact: validInterviewOutputArtifact(),
    });
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: true });

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toMatchObject({
      status: "ready",
      artifactId: "artifact-existing",
      generatedAdventureId: "generated-adventure-1",
      reusedExistingArtifact: true,
      reusedExistingAdventure: true,
    });
    expect(artifactGenerator.requests).toEqual([]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_ARTIFACT_REUSED)).toHaveLength(1);
  });

  it("returns not_found for missing or unowned interviews", async () => {
    const repository = seedConfirmedRepository();
    const result = await forgeAdventure(
      { userId: "other-user", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: new FakeInterviewOutputArtifactGenerator(),
        adventurePlanner: createAdventurePlannerReady({ reusedExistingAdventure: false }),
      },
    );

    expect(result).toEqual({ status: "not_found" });
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_NOT_FOUND)).toHaveLength(1);
  });

  it("returns not_confirmed before artifact or Adventure generation", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      ...confirmedDraft,
      interviewStatus: "awaiting_confirmation",
    });
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result.status).toBe("not_confirmed");
    expect(artifactGenerator.requests).toEqual([]);
    expect(adventurePlanner.requests).toEqual([]);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_NOT_CONFIRMED)).toHaveLength(1);
  });

  it("returns a recoverable failure when artifact generation fails", async () => {
    const repository = seedConfirmedRepository();
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    artifactGenerator.queueError(new Error("provider unavailable"));
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result.status).toBe("recoverable_failure");
    expect(adventurePlanner.requests).toEqual([]);
  });

  it("returns a recoverable failure from Adventure Planner", async () => {
    const repository = seedConfirmedRepository();
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const adventurePlanner = {
      requests: [],
      async generateAdventure(input: never) {
        this.requests.push(input);
        return { status: "recoverable_failure" as const, message: "Retry safely." };
      },
    };

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1" },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toEqual({ status: "recoverable_failure", message: "Retry safely." });
    expect(repository.savedArtifacts).toHaveLength(1);
  });
});

function seedConfirmedRepository(): FakeAdventureDraftRepository {
  const repository = new FakeAdventureDraftRepository();
  repository.seedDraft(confirmedDraft);
  repository.seedMessage({
    adventureId: "adventure-1",
    role: "user",
    content: "Become a chef",
    sequenceNumber: 1,
  });
  return repository;
}

function createAdventurePlannerReady(input: { reusedExistingAdventure: boolean }) {
  return {
    requests: [] as unknown[],
    async generateAdventure(request: unknown) {
      this.requests.push(request);
      return {
        status: "ready" as const,
        adventureId: "adventure-1",
        generatedAdventureId: "generated-adventure-1",
        reusedExistingAdventure: input.reusedExistingAdventure,
        adventure: validGeneratedAdventure(),
      };
    },
  };
}

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
