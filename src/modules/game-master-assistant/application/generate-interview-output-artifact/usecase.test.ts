import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../../server/logging/events";

import { FakeAdventureDraftRepository } from "../test/fake-adventure-draft-repository";
import {
  FakeInterviewOutputArtifactGenerator,
  validInterviewOutputArtifact,
} from "../test/fake-interview-output-artifact-generator";
import {
  INTERVIEW_NOT_CONFIRMED_MESSAGE,
  INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE,
} from "./output";
import { generateInterviewOutputArtifact } from "./usecase";

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../../server/logging/logger", () => ({
  serverLogger: {
    info: loggerMock.info,
    warn: loggerMock.warn,
  },
}));

const confirmedDraft = {
  id: "adventure-1",
  userId: "user-1",
  goalText: "Become a chef",
  readinessStatus: "ready_to_generate" as const,
  interviewStatus: "confirmed" as const,
};

describe("generateInterviewOutputArtifact", () => {
  beforeEach(() => {
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
  });

  it("generates, validates, persists, and returns a ready status for a confirmed interview", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft(confirmedDraft);
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "user",
      content: "Become a chef",
      sequenceNumber: 1,
    });
    repository.seedMessage({
      adventureId: "adventure-1",
      role: "game_master",
      content: "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
      sequenceNumber: 2,
    });
    const generator = new FakeInterviewOutputArtifactGenerator();
    generator.queueArtifact(validInterviewOutputArtifact({ goalSummary: "  Become a confident chef.  " }));

    const result = await generateInterviewOutputArtifact(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
    );

    expect(result).toEqual({
      status: "ready",
      adventureId: "adventure-1",
      artifactId: "artifact-1",
      reusedExistingArtifact: false,
    });
    expect(generator.requests).toHaveLength(1);
    expect(generator.requests[0]).toMatchObject({
      userId: "user-1",
      adventureId: "adventure-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "confirmed",
    });
    expect(generator.requests[0]?.transcript.map((message) => message.content)).toEqual([
      "Become a chef",
      "I have what I need to forge this Adventure. Anything else you want me to know before I begin?",
    ]);
    expect(repository.savedArtifacts).toHaveLength(1);
    expect(repository.savedArtifacts[0]?.artifact.goalSummary).toBe("Become a confident chef.");
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_STARTED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_STARTED,
        flow: "forge",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        readinessStatus: "ready_to_generate",
        interviewStatus: "confirmed",
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_COMPLETED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_COMPLETED,
        flow: "forge",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        artifactId: "artifact-1",
        reusedExistingArtifact: false,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Become a chef");
    expect(serializedLogPayloads()).not.toContain("I have what I need to forge");
  });

  it("reuses an existing artifact without calling the generator", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft(confirmedDraft);
    repository.seedCurrentArtifact({
      adventureId: "adventure-1",
      id: "artifact-existing",
      artifact: validInterviewOutputArtifact(),
    });
    const generator = new FakeInterviewOutputArtifactGenerator();

    const result = await generateInterviewOutputArtifact(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
    );

    expect(result).toEqual({
      status: "ready",
      adventureId: "adventure-1",
      artifactId: "artifact-existing",
      reusedExistingArtifact: true,
    });
    expect(generator.requests).toEqual([]);
    expect(repository.savedArtifacts).toEqual([]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_REUSED_EXISTING)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_REUSED_EXISTING,
        flow: "forge",
        result: "success",
        userId: "user-1",
        adventureId: "adventure-1",
        artifactId: "artifact-existing",
        reusedExistingArtifact: true,
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("rejects unconfirmed interviews before generator invocation", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft({
      id: "adventure-1",
      userId: "user-1",
      goalText: "Become a chef",
      readinessStatus: "ready_to_generate",
      interviewStatus: "awaiting_confirmation",
    });
    const generator = new FakeInterviewOutputArtifactGenerator();

    const result = await generateInterviewOutputArtifact(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
    );

    expect(result).toEqual({
      status: "not_confirmed",
      message: INTERVIEW_NOT_CONFIRMED_MESSAGE,
    });
    expect(generator.requests).toEqual([]);
    expect(repository.savedArtifacts).toEqual([]);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_CONFIRMED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_CONFIRMED,
        flow: "forge",
        result: "expected_error",
        userId: "user-1",
        adventureId: "adventure-1",
        resultCategory: "not_confirmed",
        readinessStatus: "ready_to_generate",
        interviewStatus: "awaiting_confirmation",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("returns not found for missing or unowned Adventures before generator invocation", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft(confirmedDraft);
    const generator = new FakeInterviewOutputArtifactGenerator();

    await expect(
      generateInterviewOutputArtifact(
        { userId: "other-user", adventureId: "adventure-1" },
        { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
      ),
    ).resolves.toEqual({ status: "not_found" });
    expect(generator.requests).toEqual([]);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_FOUND)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_NOT_FOUND,
        flow: "forge",
        result: "expected_error",
        userId: "other-user",
        adventureId: "adventure-1",
        resultCategory: "not_found",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("returns a recoverable failure and does not persist invalid generated artifacts", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft(confirmedDraft);
    const generator = new FakeInterviewOutputArtifactGenerator();
    generator.queueInvalidArtifact({ goalSummary: "Too little" });

    const result = await generateInterviewOutputArtifact(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
    );

    expect(result).toEqual({
      status: "recoverable_failure",
      message: INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE,
    });
    expect(repository.savedArtifacts).toEqual([]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_STARTED)).toHaveLength(1);
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_FAILED)).toEqual([
      expect.objectContaining({
        event: APPLICATION_LOG_EVENTS.FORGE_ARTIFACT_GENERATION_FAILED,
        flow: "forge",
        result: "recoverable_failure",
        userId: "user-1",
        adventureId: "adventure-1",
        resultCategory: "generation_failed",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("returns a recoverable failure when the provider fails", async () => {
    const repository = new FakeAdventureDraftRepository();
    repository.seedDraft(confirmedDraft);
    const generator = new FakeInterviewOutputArtifactGenerator();
    generator.queueError(new Error("provider unavailable"));

    const result = await generateInterviewOutputArtifact(
      { userId: "user-1", adventureId: "adventure-1" },
      { adventureDraftRepository: repository, interviewOutputArtifactGenerator: generator },
    );

    expect(result).toEqual({
      status: "recoverable_failure",
      message: INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE,
    });
    expect(repository.savedArtifacts).toEqual([]);
  });
});

function infoPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.info.mock.calls
    .map(([payload]) => payload)
    .filter(
      (payload): payload is Record<string, unknown> =>
        typeof payload === "object" &&
        payload !== null &&
        "event" in payload &&
        payload.event === event,
    );
}

function warnPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.warn.mock.calls
    .map(([payload]) => payload)
    .filter(
      (payload): payload is Record<string, unknown> =>
        typeof payload === "object" &&
        payload !== null &&
        "event" in payload &&
        payload.event === event,
    );
}

function serializedLogPayloads(): string {
  return JSON.stringify([
    ...loggerMock.info.mock.calls.map(([payload]) => payload),
    ...loggerMock.warn.mock.calls.map(([payload]) => payload),
  ]);
}
