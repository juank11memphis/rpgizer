import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { validInterviewOutputArtifact } from "../../game-master-assistant/application/test/fake-interview-output-artifact-generator";
import type { AdventureGeneratorRequest } from "../application/generate-adventure/ports";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import {
  buildGeneratedAdventureContentBoundaryPayload,
  buildGeneratedAdventureDependencyLinksBoundaryPayload,
  buildGeneratedAdventureXpBalanceBoundaryPayload,
} from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { parseGeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import { parseGeneratedAdventureXpBalance } from "../domain/generated-adventure-xp";
import { OpenAIMultiStepAdventureGenerator } from "./openai-multi-step-adventure-generator";

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("../../../server/logging/logger", () => ({
  serverLogger: loggerMock,
}));

const content = parseGeneratedAdventureContent(buildGeneratedAdventureContentBoundaryPayload());
const dependencies = parseGeneratedAdventureDependencyLinks(
  buildGeneratedAdventureDependencyLinksBoundaryPayload(),
  content,
);
const xpBalance = parseGeneratedAdventureXpBalance(
  buildGeneratedAdventureXpBalanceBoundaryPayload(),
  dependencies,
);

describe("OpenAIMultiStepAdventureGenerator", () => {
  beforeEach(() => {
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
  });

  it("orchestrates content, dependency linking, XP balancing, final assembly, and final validation in order", async () => {
    const calls: string[] = [];
    const generator = new OpenAIMultiStepAdventureGenerator({
      contentGenerator: {
        async generateAdventureContent(input) {
          calls.push("content");
          expect(input).toEqual(baseRequest());
          return content;
        },
      },
      dependencyLinker: {
        async linkAdventureDependencies(receivedContent, context) {
          calls.push("links");
          expect(receivedContent).toBe(content);
          expect(context).toEqual({ userId: "user-1", adventureId: "adventure-1" });
          return dependencies;
        },
      },
      xpBalancer: {
        async balanceAdventureXp(receivedContent, receivedDependencies, context) {
          calls.push("xp");
          expect(receivedContent).toBe(content);
          expect(receivedDependencies).toBe(dependencies);
          expect(context).toEqual({ userId: "user-1", adventureId: "adventure-1" });
          return xpBalance;
        },
      },
    });

    const adventure = await generator.generateAdventure(baseRequest());

    expect(calls).toEqual(["content", "links", "xp"]);
    expect(adventure.acts[0]?.mainQuests[0]).toMatchObject({
      key: "plan-first-menu",
      inventoryItemKeys: ["weekly-menu-template"],
      skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
    });
    expect(adventure.acts[0]?.bossFights[0]).toMatchObject({
      key: "first-weeknight-service",
      inventoryItemKeys: ["weekly-menu-template", "sharp-chefs-knife"],
      skillRewards: [
        { skillKey: "meal-planning", xp: 40 },
        { skillKey: "knife-basics", xp: 20 },
      ],
    });
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_STARTED)).toEqual([
      expect.objectContaining({
        flow: "multi_step_adventure_generation",
        operation: "generate_adventure",
        result: "started",
        userId: "user-1",
        adventureId: "adventure-1",
        artifactId: "artifact-1",
      }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_COMPLETED)).toEqual([
      expect.objectContaining({ result: "success", step: "final_assembly", skillRewardCount: 4 }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_COMPLETED)).toEqual([
      expect.objectContaining({ result: "success", step: "final_validation", questCount: 2 }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_COMPLETED)).toEqual([
      expect.objectContaining({ result: "success", durationMs: expect.any(Number) }),
    ]);
    expect(serializedLogPayloads()).not.toContain("Become a chef");
    expect(serializedLogPayloads()).not.toContain("sk-");
  });

  it("stops immediately and logs a safe workflow failure when a step fails", async () => {
    const linkAdventureDependencies = vi.fn();
    const xpBalancer = vi.fn();
    const generator = new OpenAIMultiStepAdventureGenerator({
      contentGenerator: {
        async generateAdventureContent() {
          throw new AdventureGeneratorError("provider_output_invalid", "raw prompt/output must stay hidden");
        },
      },
      dependencyLinker: { linkAdventureDependencies },
      xpBalancer: { balanceAdventureXp: xpBalancer },
    });

    await expect(generator.generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });

    expect(linkAdventureDependencies).not.toHaveBeenCalled();
    expect(xpBalancer).not.toHaveBeenCalled();
    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_WORKFLOW_FAILED)).toEqual([
      expect.objectContaining({
        result: "failure",
        providerErrorCode: "provider_output_invalid",
        providerErrorCategory: "invalid_output",
        error: expect.objectContaining({ name: "AdventureGeneratorError" }),
      }),
    ]);
  });

  it("fails final assembly safely without returning partial content or calling later validation", async () => {
    const badDependencies = { ...dependencies, questLinks: dependencies.questLinks.slice(1) };
    const generator = new OpenAIMultiStepAdventureGenerator({
      contentGenerator: { generateAdventureContent: vi.fn().mockResolvedValue(content) },
      dependencyLinker: { linkAdventureDependencies: vi.fn().mockResolvedValue(badDependencies) },
      xpBalancer: { balanceAdventureXp: vi.fn().mockResolvedValue(xpBalance) },
    });

    await expect(generator.generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });

    expect(warnPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_FAILED)).toEqual([
      expect.objectContaining({ result: "failure", step: "final_assembly" }),
    ]);
    expect(infoPayloadsFor(APPLICATION_LOG_EVENTS.FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_COMPLETED)).toEqual([]);
  });

  it("does not add broad repair retries around invalid step output", async () => {
    const generateAdventureContent = vi.fn().mockRejectedValue(
      new AdventureGeneratorError("provider_output_invalid", "invalid content"),
    );
    const generator = new OpenAIMultiStepAdventureGenerator({
      contentGenerator: { generateAdventureContent },
      dependencyLinker: { linkAdventureDependencies: vi.fn() },
      xpBalancer: { balanceAdventureXp: vi.fn() },
    });

    await expect(generator.generateAdventure(baseRequest())).rejects.toMatchObject({
      code: "provider_output_invalid",
    });

    expect(generateAdventureContent).toHaveBeenCalledTimes(1);
    expect(serializedLogPayloads()).not.toContain('"retrying"');
  });
});

function infoPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.info.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
}

function warnPayloadsFor(event: string): ReadonlyArray<Record<string, unknown>> {
  return loggerMock.warn.mock.calls.map(([payload]) => payload).filter(isPayloadFor(event));
}

function isPayloadFor(event: string) {
  return (payload: unknown): payload is Record<string, unknown> =>
    typeof payload === "object" && payload !== null && "event" in payload && payload.event === event;
}

function serializedLogPayloads(): string {
  return JSON.stringify([
    ...loggerMock.error.mock.calls.map(([payload]) => payload),
    ...loggerMock.info.mock.calls.map(([payload]) => payload),
    ...loggerMock.warn.mock.calls.map(([payload]) => payload),
  ]);
}

function baseRequest(): AdventureGeneratorRequest {
  return {
    userId: "user-1",
    adventureId: "adventure-1",
    goalText: "Become a chef",
    interviewOutputArtifactId: "artifact-1",
    interviewOutputArtifact: validInterviewOutputArtifact(),
    transcript: [
      {
        id: "message-1",
        role: "user",
        content: "Become a chef",
        sequenceNumber: 1,
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      },
    ],
  };
}
