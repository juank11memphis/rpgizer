import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { loadInterviewOutputArtifactEvalFixtures } from "./file-system-interview-output-artifact-eval-fixtures";

describe("loadInterviewOutputArtifactEvalFixtures", () => {
  it("loads bundled Interview Output Artifact fixtures", async () => {
    const fixtures = await loadInterviewOutputArtifactEvalFixtures();

    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      "become-a-confident-home-chef",
      "high-stakes-financial-stability",
    ]);
    expect(fixtures[0]?.expectations.goalSummary.includes).toContain("confident");
    expect(fixtures[1]?.expectations.safetyBoundaries.includes).toContain("financial advice");
    expect(fixtures[1]?.expectations.currentStage.includesAny).toEqual([
      ["missed rent", "rent was missed"],
    ]);
  });

  it("rejects malformed fixtures with safe actionable errors", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "artifact-fixtures-"));

    try {
      await writeFile(
        path.join(directory, "bad.json"),
        JSON.stringify({
          id: "bad-fixture",
          name: "Bad fixture",
          context: {
            goalText: "Do a thing",
            readinessStatus: "ready_to_generate",
            interviewStatus: "confirmed",
          },
          transcript: [{ role: "user", content: "hello" }],
          expectations: {
            goalSummary: { includes: [] },
          },
        }),
      );

      await expect(loadInterviewOutputArtifactEvalFixtures(directory)).rejects.toThrow(
        "bad.json: expectations.goalSummary must define includes or includesAny.",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
