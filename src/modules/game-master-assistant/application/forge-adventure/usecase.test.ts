import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";
import {
  buildGeneratedAdventureBoundaryPayload,
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../../../adventure-planner/application/test/generated-adventure-fixtures";
import { parseGeneratedAdventure } from "../../../adventure-planner/domain/generated-adventure";
import { parseGeneratedAdventureContent } from "../../../adventure-planner/domain/generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "../../../adventure-planner/domain/generated-adventure-dependencies";
import { parseGeneratedAdventureXpBalance } from "../../../adventure-planner/domain/generated-adventure-xp";
import { AdventureGeneratorError } from "../../../adventure-planner/application/generate-adventure/ports";
import type { ForgeProgressEvent } from "./ports";
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
    const progressEvents: ForgeProgressEvent[] = [];

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
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
    expect(adventurePlanner.contentRequests).toEqual([
      expect.objectContaining({
        userId: "user-1",
        adventureId: "adventure-1",
        goalText: "Become a chef",
        interviewOutputArtifactId: "artifact-1",
      }),
    ]);
    expect(progressEvents).toEqual([
      { stage: "quest_lore", status: "started" },
      { stage: "quest_lore", status: "completed" },
      { stage: "adventure_roadmap", status: "started" },
      { stage: "adventure_roadmap", status: "completed" },
      { stage: "connections", status: "started" },
      { stage: "connections", status: "completed" },
      { stage: "xp_rewards", status: "started" },
      { stage: "xp_rewards", status: "completed" },
      { stage: "opening_adventure", status: "started" },
      { stage: "opening_adventure", status: "completed" },
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

  it("reports sensible progress when reusing an existing artifact", async () => {
    const repository = seedConfirmedRepository();
    repository.seedCurrentArtifact({
      adventureId: "adventure-1",
      id: "artifact-existing",
      artifact: validInterviewOutputArtifact(),
    });
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });
    const progressEvents: ForgeProgressEvent[] = [];

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toMatchObject({
      status: "ready",
      artifactId: "artifact-existing",
      reusedExistingArtifact: true,
      reusedExistingAdventure: false,
    });
    expect(artifactGenerator.requests).toEqual([]);
    expect(progressEvents).toEqual([
      { stage: "quest_lore", status: "started" },
      { stage: "quest_lore", status: "completed" },
      { stage: "adventure_roadmap", status: "started" },
      { stage: "adventure_roadmap", status: "completed" },
      { stage: "connections", status: "started" },
      { stage: "connections", status: "completed" },
      { stage: "xp_rewards", status: "started" },
      { stage: "xp_rewards", status: "completed" },
      { stage: "opening_adventure", status: "started" },
      { stage: "opening_adventure", status: "completed" },
    ]);
  });

  it("reports only the real opening step when reusing a generated Adventure", async () => {
    const repository = seedConfirmedRepository();
    repository.seedCurrentArtifact({
      adventureId: "adventure-1",
      id: "artifact-existing",
      artifact: validInterviewOutputArtifact(),
    });
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: true });
    const progressEvents: ForgeProgressEvent[] = [];

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toMatchObject({
      status: "ready",
      generatedAdventureId: "generated-adventure-1",
      reusedExistingArtifact: true,
      reusedExistingAdventure: true,
    });
    expect(progressEvents).toEqual([
      { stage: "quest_lore", status: "started" },
      { stage: "quest_lore", status: "completed" },
      { stage: "opening_adventure", status: "started" },
      { stage: "opening_adventure", status: "completed" },
    ]);
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
    const progressEvents: ForgeProgressEvent[] = [];

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result.status).toBe("not_confirmed");
    expect(artifactGenerator.requests).toEqual([]);
    expect(adventurePlanner.contentRequests).toEqual([]);
    expect(progressEvents).toEqual([]);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_NOT_CONFIRMED)).toHaveLength(1);
  });

  it("returns a recoverable failure when artifact generation fails", async () => {
    const repository = seedConfirmedRepository();
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    artifactGenerator.queueError(new Error("provider unavailable"));
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });
    const progressEvents: ForgeProgressEvent[] = [];

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result.status).toBe("recoverable_failure");
    expect(adventurePlanner.contentRequests).toEqual([]);
    expect(progressEvents).toEqual([{ stage: "quest_lore", status: "started" }]);
  });

  it("returns a recoverable failure from Adventure Planner content generation", async () => {
    const repository = seedConfirmedRepository();
    const artifactGenerator = new FakeInterviewOutputArtifactGenerator();
    const progressEvents: ForgeProgressEvent[] = [];
    const adventurePlanner = createAdventurePlannerReady({ reusedExistingAdventure: false });
    adventurePlanner.contentError = new AdventureGeneratorError("provider_request_failed", "provider failed");

    const result = await forgeAdventure(
      { userId: "user-1", adventureId: "adventure-1", progressReporter: collectProgress(progressEvents) },
      {
        adventureDraftRepository: repository,
        interviewOutputArtifactGenerator: artifactGenerator,
        adventurePlanner,
      },
    );

    expect(result).toEqual({ status: "recoverable_failure", message: "Your interview is safe. Try again when you’re ready." });
    expect(repository.savedArtifacts).toHaveLength(1);
    expect(progressEvents).toEqual([
      { stage: "quest_lore", status: "started" },
      { stage: "quest_lore", status: "completed" },
      { stage: "adventure_roadmap", status: "started" },
    ]);
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
  const content = parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
  const dependencies = parseGeneratedAdventureDependencyLinks(
    buildGeneratedAdventureDependencyLinksBoundaryPayload(),
    content,
  );
  const xpBalance = parseGeneratedAdventureXpBalance(
    buildGeneratedAdventureXpBalanceBoundaryPayload(),
    dependencies,
  );
  const existingAdventure = input.reusedExistingAdventure
    ? {
        adventureId: "adventure-1",
        generatedAdventureId: "generated-adventure-1",
        adventure: validGeneratedAdventure(),
      }
    : null;

  return {
    contentRequests: [] as unknown[],
    savedAdventureInputs: [] as unknown[],
    contentError: null as Error | null,
    async findExistingGeneratedAdventure() {
      return existingAdventure;
    },
    async generateAdventureContent(request: unknown) {
      this.contentRequests.push(request);
      if (this.contentError) throw this.contentError;
      return content;
    },
    async linkAdventureDependencies() {
      return dependencies;
    },
    async balanceAdventureXp() {
      return xpBalance;
    },
    async saveGeneratedAdventure(request: unknown) {
      this.savedAdventureInputs.push(request);
      return {
        adventureId: "adventure-1",
        generatedAdventureId: "generated-adventure-1",
        reusedExistingAdventure: false,
        adventure: validGeneratedAdventure(),
      };
    },
  };
}

function collectProgress(events: ForgeProgressEvent[]) {
  return {
    report(event: ForgeProgressEvent) {
      events.push(event);
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

function validGeneratedAdventure() {
  return parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
}
