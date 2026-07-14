import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseGeneratedAdventureContent } from "../domain/generated-adventure-content";
import { buildContentPayload, buildFixture } from "./focused-eval-test-helpers";
import { runAdventureContentEvals, type AdventureContentEvalGenerator } from "./run-adventure-content-evals";

function buildEnvironment(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", OPENAI_API_KEY: "sk-test", OPENAI_ADVENTURE_CONTENT_MODEL: "gpt-test", ...overrides };
}

function createOutputCollector(): { output: () => string; stream: Pick<NodeJS.WriteStream, "write"> } {
  let output = "";
  return { output: () => output, stream: { write: (chunk) => { output += String(chunk); return true; } } };
}

async function createFixtureDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "adventure-content-evals-"));
  await writeFile(path.join(directory, "01-spanish.json"), JSON.stringify(buildFixture()));
  return directory;
}

describe("Adventure content eval runner", () => {
  it("runs fixtures through an injected content generator", async () => {
    const fixturesDirectory = await createFixtureDirectory();
    const output = createOutputCollector();
    const errorOutput = createOutputCollector();
    const seenRequests: string[] = [];
    const generator: AdventureContentEvalGenerator = {
      async generateAdventureContent(input) {
        seenRequests.push(input.adventureId);
        return parseGeneratedAdventureContent(buildContentPayload());
      },
    };

    const result = await runAdventureContentEvals({
      fixturesDirectory,
      environment: buildEnvironment(),
      createGenerator: () => generator,
      output: output.stream,
      errorOutput: errorOutput.stream,
    });

    expect(result).toMatchObject({ passed: true, fixtureIds: ["spanish-eval"], diagnostics: [] });
    expect(seenRequests).toEqual(["eval-adventure-spanish-eval"]);
    expect(output.output()).toBe("Adventure content evals passed: spanish-eval\n");
    expect(errorOutput.output()).toBe("");
  });

  it("returns clear configuration diagnostics before creating a live provider", async () => {
    const errorOutput = createOutputCollector();
    const result = await runAdventureContentEvals({
      environment: buildEnvironment({ OPENAI_API_KEY: "" }),
      createGenerator: () => { throw new Error("should not create provider"); },
      errorOutput: errorOutput.stream,
    });

    expect(result.passed).toBe(false);
    expect(errorOutput.output()).toContain("OPENAI_API_KEY is required to run Adventure content generation evals");
  });
});
