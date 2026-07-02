import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const bannedPlanningTermPatterns = [
  /\broadmaps?\b/,
  /\bquests?\b/,
  /\bskills?\b/,
  /\binventory\b/,
  /\bboss fights?\b/,
  /\bachievements?\b/,
  /\bxp\b/,
  /\bacts?\b/,
  /\bprogression\b/,
];

describe("interview output artifact prompt", () => {
  it("asks only for interview signal distillation, not future plan content", () => {
    const prompt = readFileSync(
      join(process.cwd(), "src/modules/game-master-assistant/infra/prompts/interview-output-artifact.md"),
      "utf8",
    );
    const normalizedPrompt = prompt.toLowerCase();

    expect(normalizedPrompt).toContain("distill");
    expect(normalizedPrompt).toContain("goal summary");
    expect(normalizedPrompt).toContain("safety boundaries");
    for (const bannedPattern of bannedPlanningTermPatterns) {
      expect(normalizedPrompt).not.toMatch(bannedPattern);
    }
  });
});
