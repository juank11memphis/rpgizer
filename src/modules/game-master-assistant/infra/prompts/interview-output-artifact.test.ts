import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const bannedPlanningTermPatterns = [
  /\broadmaps?\b/,
  /\bquests?\b/,
  /\binventory\b/,
  /\bboss fights?\b/,
  /\bachievements?\b/,
  /\bxp\b/,
  /\bacts?\b/,
  /\bprogression\b/,
];

const requiredRicherSignalTerms = [
  "goaltype",
  "motivationdetails",
  "preferences",
  "dislikesoravoidances",
  "currentskillorbaseline",
  "priorattempts",
  "confidencegaps",
  "existingresources",
  "missingresources",
  "examplesorinspirations",
  "firstmilestonereadiness",
  "safetyboundaries",
];

describe("interview output artifact prompt", () => {
  it("asks only for interview signal distillation, not future plan content", () => {
    const normalizedPrompt = loadPrompt().toLowerCase();

    expect(normalizedPrompt).toContain("distill");
    expect(normalizedPrompt).toContain("goalsummary");
    expect(normalizedPrompt).toContain("safetyboundaries");
    for (const bannedPattern of bannedPlanningTermPatterns) {
      expect(normalizedPrompt).not.toMatch(bannedPattern);
    }
  });

  it("maps transcript evidence into richer artifact fields", () => {
    const normalizedPrompt = loadPrompt().toLowerCase();

    for (const requiredTerm of requiredRicherSignalTerms) {
      expect(normalizedPrompt).toContain(requiredTerm);
    }
    expect(normalizedPrompt).toContain("use the transcript as evidence");
    expect(normalizedPrompt).toContain("not clearly stated");
  });

  it("keeps high-stakes content as boundaries instead of authoritative advice", () => {
    const normalizedPrompt = loadPrompt().toLowerCase();

    expect(normalizedPrompt).toContain("non-authoritative boundaries");
    expect(normalizedPrompt).toContain("financial advice");
    expect(normalizedPrompt).toContain("legal advice");
    expect(normalizedPrompt).toContain("medical");
    expect(normalizedPrompt).toContain("do not design");
    expect(normalizedPrompt).toContain("expert advice");
  });
});

function loadPrompt(): string {
  return readFileSync(
    join(process.cwd(), "src/modules/game-master-assistant/infra/prompts/interview-output-artifact.md"),
    "utf8",
  );
}
