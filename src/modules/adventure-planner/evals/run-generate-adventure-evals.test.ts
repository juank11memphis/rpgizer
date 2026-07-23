import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildGeneratedAdventureBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { AdventureGeneratorError } from "../application/generate-adventure/ports";
import { parseGeneratedAdventure } from "../domain/generated-adventure";
import { parseGenerateAdventureEvalFixture } from "./generate-adventure-eval-fixture-parser";
import {
  buildAdventureGeneratorRequest,
  buildAdventureGenerationStepConfigs,
  formatDiagnostic,
  loadGenerateAdventureEvalFixtures,
  runGenerateAdventureEvals,
  validateOpenAIConfiguration,
  type GenerateAdventureEvalGenerator,
} from "./run-generate-adventure-evals";

function buildFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "cooking-eval",
    name: "Cooking eval",
    goalText: "Learn weeknight cooking with repeatable meal planning.",
    interviewOutputArtifact: {
      goalSummary: "Cook three practical weeknight dinners.",
      coreWhy: "Feel confident feeding myself after work.",
      successDefinition: "Three dinners are cooked and reviewed.",
      currentStage: "Can follow recipes but needs meal planning routines.",
      blockers: ["Time pressure"],
      constraints: ["Thirty-minute weeknight sessions"],
      existingResources: ["Kitchen tools", "Recipe bookmarks"],
      likelyMissingResources: ["Weekly menu template"],
      safetyBoundaries: ["Educational cooking guidance only"],
      preferences: ["Cozy guild framing"],
      compactSourceSummary: "The user wants practical cooking routines.",
    },
    transcript: [{ role: "user", content: "I want to cook dinner more often." }],
    expectations: {
      highStakesSafety: false,
      expectedGoalTerms: ["cooking"],
      expectedSkillThemes: ["meal"],
      expectedInventoryThemes: ["template"],
      forbiddenAdvicePatterns: ["guaranteed cure"],
    },
    ...overrides,
  };
}

function buildEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-test",
    OPENAI_ADVENTURE_GENERATION_MODEL: "gpt-test",
    ...overrides,
  };
}

function createOutputCollector(): { output: () => string; stream: Pick<NodeJS.WriteStream, "write"> } {
  let output = "";

  return {
    output: () => output,
    stream: {
      write: (chunk: string | Uint8Array) => {
        output += String(chunk);
        return true;
      },
    },
  };
}

async function createFixtureDirectory(fixtures: Record<string, unknown>[]): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "generate-adventure-evals-"));

  await Promise.all(
    fixtures.map((fixture, index) =>
      writeFile(
        path.join(directory, `${String(index + 1).padStart(2, "0")}-${fixture.id}.json`),
        JSON.stringify(fixture),
      ),
    ),
  );

  return directory;
}

describe("Generate Adventure eval runner", () => {
  it("validates missing and placeholder OpenAI configuration clearly", () => {
    expect(validateOpenAIConfiguration(buildEnvironment({ OPENAI_API_KEY: " " }))).toContain(
      "OPENAI_API_KEY is required to run Generate Adventure evals",
    );
    expect(validateOpenAIConfiguration(buildEnvironment({ OPENAI_API_KEY: "placeholder" }))).toBe(
      "OPENAI_API_KEY appears to be a placeholder value.",
    );
    expect(
      validateOpenAIConfiguration(buildEnvironment({ OPENAI_ADVENTURE_GENERATION_MODEL: " " })),
    ).toBeNull();
    expect(
      validateOpenAIConfiguration(
        buildEnvironment({ OPENAI_ADVENTURE_GENERATION_MODEL: "replace-with-model" }),
      ),
    ).toBe("OPENAI_ADVENTURE_GENERATION_MODEL appears to be a placeholder value.");
    expect(
      validateOpenAIConfiguration(
        buildEnvironment({ OPENAI_ADVENTURE_CONTENT_MODEL: "replace-with-content-model" }),
      ),
    ).toBe("OPENAI_ADVENTURE_CONTENT_MODEL appears to be a placeholder value.");
    expect(
      validateOpenAIConfiguration(
        buildEnvironment({ OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "replace-with-linker-model" }),
      ),
    ).toBe("OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL appears to be a placeholder value.");
    expect(
      validateOpenAIConfiguration(
        buildEnvironment({ OPENAI_ADVENTURE_XP_BALANCER_MODEL: "replace-with-xp-model" }),
      ),
    ).toBe("OPENAI_ADVENTURE_XP_BALANCER_MODEL appears to be a placeholder value.");
    expect(validateOpenAIConfiguration(buildEnvironment())).toBeNull();
  });

  it("builds aggregate Adventure Generation step configs with one selected model", () => {
    const configs = buildAdventureGenerationStepConfigs(
      buildEnvironment({
        OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-content",
        OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "gpt-linking",
        OPENAI_ADVENTURE_XP_BALANCER_MODEL: "gpt-xp",
      }),
      "o4-mini",
    );

    expect(configs).toEqual({
      content: { apiKey: "sk-test", model: "o4-mini" },
      dependencyLinker: { apiKey: "sk-test", model: "o4-mini" },
      xpBalancer: { apiKey: "sk-test", model: "o4-mini" },
    });
  });

  it("keeps aggregate Adventure Generation step config defaults when no model is selected", () => {
    const configs = buildAdventureGenerationStepConfigs(
      buildEnvironment({
        OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-content",
        OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "gpt-linking",
        OPENAI_ADVENTURE_XP_BALANCER_MODEL: "gpt-xp",
      }),
    );

    expect(configs).toEqual({
      content: { apiKey: "sk-test", model: "gpt-content" },
      dependencyLinker: { apiKey: "sk-test", model: "gpt-linking" },
      xpBalancer: { apiKey: "sk-test", model: "gpt-xp" },
    });
  });

  it("allows selected models to override placeholder aggregate step model settings", () => {
    expect(
      validateOpenAIConfiguration(
        buildEnvironment({
          OPENAI_ADVENTURE_CONTENT_MODEL: "replace-with-content-model",
          OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "replace-with-linker-model",
          OPENAI_ADVENTURE_XP_BALANCER_MODEL: "replace-with-xp-model",
        }),
        "o4-mini",
      ),
    ).toBeNull();
  });

  it("loads JSON fixtures in deterministic filename order", async () => {
    const directory = await createFixtureDirectory([
      buildFixture({ id: "second", name: "Second" }),
      buildFixture({ id: "first", name: "First" }),
    ]);

    const fixtures = await loadGenerateAdventureEvalFixtures(directory);

    expect(fixtures.map((fixture) => fixture.id)).toEqual(["second", "first"]);
  });

  it("builds stable Adventure generator requests from fixtures", () => {
    const request = buildAdventureGeneratorRequest(
      loadFixtureForRequest(buildFixture({ id: "learn-cooking" })),
    );

    expect(request).toMatchObject({
      userId: "eval-user-learn-cooking",
      adventureId: "eval-adventure-learn-cooking",
      interviewOutputArtifactId: "eval-artifact-learn-cooking",
      transcript: [
        {
          id: "eval-message-learn-cooking-1",
          sequenceNumber: 1,
          role: "user",
          content: "I want to cook dinner more often.",
        },
      ],
    });
    expect(request.transcript[0].createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("runs fixtures through an injected generator and prints a pass summary", async () => {
    const directory = await createFixtureDirectory([buildFixture()]);
    const output = createOutputCollector();
    const errorOutput = createOutputCollector();
    const seenRequests: string[] = [];
    const generator: GenerateAdventureEvalGenerator = {
      async generateAdventure(input) {
        seenRequests.push(input.adventureId);
        return parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
      },
    };

    const result = await runGenerateAdventureEvals({
      fixturesDirectory: directory,
      environment: buildEnvironment(),
      createGenerator: () => generator,
      output: output.stream,
      errorOutput: errorOutput.stream,
    });

    expect(result).toMatchObject({
      passed: true,
      fixtureIds: ["cooking-eval"],
      diagnostics: [],
      assertionResults: [
        {
          fixtureId: "cooking-eval",
          assertions: expect.arrayContaining([
            { id: "adventure-required-structure", label: "Required Structure", status: "passed" },
          ]),
        },
      ],
      cellOutputs: [
        {
          fixtureId: "cooking-eval",
          outputPreview: "The Hearthfire Cooking Quest",
          outputMarkdown: expect.stringContaining("The Hearthfire Cooking Quest"),
          artifacts: expect.arrayContaining([
            expect.objectContaining({ id: "prompt", label: "Raw prompt", redactionState: "not_available" }),
            expect.objectContaining({ id: "request", label: "Raw request" }),
            expect.objectContaining({ id: "response", label: "Raw response" }),
            expect.objectContaining({ id: "expected", label: "Expected / Golden" }),
          ]),
        },
      ],
    });
    expect(seenRequests).toEqual(["eval-adventure-cooking-eval"]);
    expect(output.output()).toBe("Generate Adventure evals passed: cooking-eval\n");
    expect(errorOutput.output()).toBe("");
  });

  it("runs only the selected test case when scoped", async () => {
    const directory = await createFixtureDirectory([
      buildFixture({ id: "first-eval", name: "First eval" }),
      buildFixture({ id: "selected-eval", name: "Selected eval" }),
    ]);
    const seenRequests: string[] = [];

    const result = await runGenerateAdventureEvals({
      fixturesDirectory: directory,
      testCaseId: "selected-eval",
      environment: buildEnvironment(),
      createGenerator: () => ({
        async generateAdventure(input) {
          seenRequests.push(input.adventureId);
          return parseGeneratedAdventure(buildGeneratedAdventureBoundaryPayload());
        },
      }),
      output: createOutputCollector().stream,
      errorOutput: createOutputCollector().stream,
    });

    expect(result).toMatchObject({ passed: true, fixtureIds: ["selected-eval"], diagnostics: [] });
    expect(seenRequests).toEqual(["eval-adventure-selected-eval"]);
  });

  it("formats generation failures without leaking SDK internals", async () => {
    const directory = await createFixtureDirectory([buildFixture()]);
    const errorOutput = createOutputCollector();

    const result = await runGenerateAdventureEvals({
      fixturesDirectory: directory,
      environment: buildEnvironment(),
      createGenerator: () => ({
        async generateAdventure() {
          throw new AdventureGeneratorError(
            "provider_output_invalid",
            "OpenAI structured output was not valid JSON.",
          );
        },
      }),
      output: createOutputCollector().stream,
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        fixtureId: "cooking-eval",
        area: "generation",
        message: "OpenAI Adventure output was invalid: OpenAI structured output was not valid JSON.",
      },
    ]);
    expect(errorOutput.output()).toContain("[cooking-eval] generation:");
  });

  it("includes safe validation details for invalid provider output", async () => {
    const directory = await createFixtureDirectory([buildFixture()]);
    const errorOutput = createOutputCollector();

    const result = await runGenerateAdventureEvals({
      fixturesDirectory: directory,
      environment: buildEnvironment(),
      createGenerator: () => ({
        async generateAdventure() {
          throw new AdventureGeneratorError(
            "provider_output_invalid",
            "Multi-step Adventure final assembly failed.",
            { cause: new Error("Generated adventure field inventoryItemKeys must be an array.") },
          );
        },
      }),
      output: createOutputCollector().stream,
      errorOutput: errorOutput.stream,
    });

    expect(result.diagnostics[0]).toMatchObject({
      fixtureId: "cooking-eval",
      area: "final assembly",
      message:
        "OpenAI Adventure output was invalid: Multi-step Adventure final assembly failed. Validation detail: Generated adventure field inventoryItemKeys must be an array.",
    });
    expect(errorOutput.output()).not.toContain("sk-test");
    expect(errorOutput.output()).not.toContain("I want to cook dinner more often");
  });


  it("classifies step-aware generation failures without leaking sensitive payloads", async () => {
    const directory = await createFixtureDirectory([buildFixture()]);
    const errorOutput = createOutputCollector();

    const result = await runGenerateAdventureEvals({
      fixturesDirectory: directory,
      environment: buildEnvironment(),
      createGenerator: () => ({
        async generateAdventure() {
          throw new AdventureGeneratorError(
            "provider_output_invalid",
            "OpenAI Adventure dependency linking request failed.",
            { cause: new Error("raw prompt/output must stay hidden") },
          );
        },
      }),
      output: createOutputCollector().stream,
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(false);
    expect(result.diagnostics).toEqual([
      {
        fixtureId: "cooking-eval",
        area: "dependency linking",
        message: "OpenAI Adventure output was invalid: OpenAI Adventure dependency linking request failed.",
      },
    ]);
    expect(errorOutput.output()).toContain("[cooking-eval] dependency linking:");
    expect(errorOutput.output()).not.toContain("raw prompt/output must stay hidden");
    expect(errorOutput.output()).not.toContain("sk-test");
    expect(errorOutput.output()).not.toContain("I want to cook dinner more often");
  });

  it("formats diagnostics consistently", () => {
    expect(
      formatDiagnostic({ fixtureId: "build-a-product", area: "side quest quality", message: "weak" }),
    ).toBe("[build-a-product] side quest quality: weak");
  });
});

function loadFixtureForRequest(input: Record<string, unknown>) {
  return parseGenerateAdventureEvalFixture(input, "request.json");
}
