import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildContentPayload, buildDependencyLinks, buildXpBalance } from "./focused-eval-test-helpers";
import { loadAdventureXpEvalFixtures, runAdventureXpEvals } from "./run-adventure-xp-evals";

function buildEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", OPENAI_API_KEY: "sk-test", OPENAI_ADVENTURE_XP_BALANCER_MODEL: "gpt-test", ...overrides };
}

function createOutputCollector(): { output: () => string; stream: Pick<NodeJS.WriteStream, "write"> } {
  let output = "";
  return { output: () => output, stream: { write: (chunk) => { output += String(chunk); return true; } } };
}

async function createFixtureDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "adventure-xp-evals-"));
  await writeFile(path.join(directory, "01-spanish.json"), JSON.stringify({
    id: "spanish-eval",
    name: "Spanish eval",
    content: buildContentPayload(),
    dependencies: buildDependencyLinks(),
  }));
  return directory;
}

describe("Adventure XP eval runner", () => {
  it("loads and parses linked fixtures", async () => {
    const fixtures = await loadAdventureXpEvalFixtures(await createFixtureDirectory());
    expect(fixtures[0].dependencies.bossFightLinks[0].bossFightKey).toBe("boss-coffee-chat");
  });

  it("runs fixtures through an injected XP balancer", async () => {
    const output = createOutputCollector();
    const errorOutput = createOutputCollector();
    const seenDependencyCounts: number[] = [];

    const result = await runAdventureXpEvals({
      fixturesDirectory: await createFixtureDirectory(),
      environment: buildEnvironment(),
      createBalancer: () => ({
        async balanceAdventureXp(_content, dependencies) {
          seenDependencyCounts.push(dependencies.questLinks.length + dependencies.bossFightLinks.length);
          return buildXpBalance();
        },
      }),
      output: output.stream,
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(true);
    expect(seenDependencyCounts).toEqual([3]);
    expect(errorOutput.output()).toBe("");
  });

  it("reports missing configuration without a live OpenAI call", async () => {
    const errorOutput = createOutputCollector();
    const result = await runAdventureXpEvals({
      environment: buildEnvironment({ OPENAI_ADVENTURE_XP_BALANCER_MODEL: "replace-with-model" }),
      createBalancer: () => { throw new Error("should not create provider"); },
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(false);
    expect(errorOutput.output()).toContain("OPENAI_ADVENTURE_XP_BALANCER_MODEL appears to be a placeholder value");
  });
});
