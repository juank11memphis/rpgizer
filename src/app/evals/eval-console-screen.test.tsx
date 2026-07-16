import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GAME_MASTER_INTERVIEW_EVAL_SUITE_ID } from "@/modules/product-quality-evaluation/domain/eval-suite";

import { EvalMatrixScreen } from "./eval-matrix-screen";
import { createReadyEvalMatrixViewModel } from "./eval-matrix-view-model";

describe("legacy eval console route shell", () => {
  it("has been replaced by the Local Eval Matrix shell", () => {
    const markup = renderToStaticMarkup(
      <EvalMatrixScreen
        viewModel={createReadyEvalMatrixViewModel(
          [
            {
              id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
              name: "Game Master Interview",
              shortDescription: "Checks focused, useful interview turns.",
              purpose: "Checks focused Game Master interview behavior.",
            },
          ],
          GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
        )}
        onRunSelectedEval={() => undefined}
      />,
    );

    expect(markup).toContain("Local Eval Matrix");
    expect(markup).not.toContain("Arcane Eval Console");
  });
});
