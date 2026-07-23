import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildContentPayload, buildDependencyLinks } from "./focused-eval-test-helpers";
import { loadAdventureLinkingEvalFixtures, runAdventureLinkingEvals } from "./run-adventure-linking-evals";

function buildEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", OPENAI_API_KEY: "sk-test", OPENAI_ADVENTURE_DEPENDENCY_LINKER_MODEL: "gpt-test", ...overrides };
}

function createOutputCollector(): { output: () => string; stream: Pick<NodeJS.WriteStream, "write"> } {
  let output = "";
  return { output: () => output, stream: { write: (chunk) => { output += String(chunk); return true; } } };
}

async function createFixtureDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "adventure-linking-evals-"));
  await writeFile(path.join(directory, "01-spanish.json"), JSON.stringify({
    id: "spanish-eval",
    name: "Spanish eval",
    content: buildContentPayload(),
    expectations: { expectedInventoryCoverage: ["quest-prompt-list"] },
  }));
  return directory;
}

describe("Adventure linking eval runner", () => {
  it("loads and parses unlinked content fixtures", async () => {
    const fixtures = await loadAdventureLinkingEvalFixtures(await createFixtureDirectory());
    expect(fixtures[0].content.acts[0].mainQuests[0].key).toBe("quest-prompt-list");
  });

  it("runs fixtures through an injected linker", async () => {
    const output = createOutputCollector();
    const errorOutput = createOutputCollector();
    const seenContentTitles: string[] = [];

    const result = await runAdventureLinkingEvals({
      fixturesDirectory: await createFixtureDirectory(),
      environment: buildEnvironment(),
      createLinker: () => ({
        async linkAdventureDependencies(content) {
          seenContentTitles.push(content.title);
          return buildDependencyLinks();
        },
      }),
      output: output.stream,
      errorOutput: errorOutput.stream,
    });

    expect(result).toMatchObject({
      passed: true,
      fixtureIds: ["spanish-eval"],
      diagnostics: [],
      cellOutputs: [
        {
          fixtureId: "spanish-eval",
          outputPreview: "3 dependency links",
          outputMarkdown: expect.stringContaining("quest-prompt-list"),
          artifacts: expect.arrayContaining([
            expect.objectContaining({ id: "prompt", label: "Raw prompt" }),
            expect.objectContaining({ id: "request", label: "Raw request" }),
            expect.objectContaining({ id: "response", label: "Raw response" }),
            expect.objectContaining({ id: "expected", label: "Expected / Golden" }),
          ]),
        },
      ],
      assertionResults: [
        { fixtureId: "spanish-eval", assertions: [{ id: "adventure-references", label: "References", status: "passed" }] },
      ],
    });
    expect(seenContentTitles).toEqual(["Spanish Coffee Chat Quest"]);
    expect(errorOutput.output()).toBe("");
  });

  it("runs only the selected test case when scoped", async () => {
    const seenContentTitles: string[] = [];

    const result = await runAdventureLinkingEvals({
      fixturesDirectory: await createFixtureDirectory(),
      testCaseId: "spanish-eval",
      environment: buildEnvironment(),
      createLinker: () => ({
        async linkAdventureDependencies(content) {
          seenContentTitles.push(content.title);
          return buildDependencyLinks();
        },
      }),
      output: createOutputCollector().stream,
      errorOutput: createOutputCollector().stream,
    });

    expect(result).toMatchObject({ passed: true, fixtureIds: ["spanish-eval"] });
    expect(seenContentTitles).toEqual(["Spanish Coffee Chat Quest"]);
  });

  it("reports missing configuration without a live OpenAI call", async () => {
    const errorOutput = createOutputCollector();
    const result = await runAdventureLinkingEvals({
      environment: buildEnvironment({ OPENAI_API_KEY: "placeholder" }),
      createLinker: () => { throw new Error("should not create provider"); },
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(false);
    expect(errorOutput.output()).toContain("OPENAI_API_KEY appears to be a placeholder value");
  });
});
