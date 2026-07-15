import { describe, expect, it } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "../../domain/eval-suite";
import { listEvalSuites } from "./usecase";

describe("listEvalSuites", () => {
  it("returns only the Game Master Interview eval suite", () => {
    const suites = listEvalSuites();

    expect(suites).toHaveLength(1);
    expect(suites[0]).toMatchObject({
      id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      name: "Game Master Interview",
      shortDescription: "Checks focused, useful interview turns.",
    });
  });

  it("provides UI display metadata for the selected Ready shell", () => {
    const [suite] = listEvalSuites();

    expect(suite?.purpose).toContain("focused questions");
    expect(suite?.purpose).not.toContain("OPENAI_API_KEY");
  });
});
