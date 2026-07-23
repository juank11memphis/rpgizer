/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EvalRunResult } from "@/modules/product-quality-evaluation/application/run-eval-suite/output";
import {
  GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
  GENERATE_ADVENTURE_EVAL_SUITE_ID,
  type EvalSuiteSummary,
} from "@/modules/product-quality-evaluation/domain/eval-suite";
import { buildEvalLlmConfiguration } from "@/modules/product-quality-evaluation/domain/eval-llm-model-configuration";

import { EvalMatrixClient } from "./eval-matrix-client";
import type { EvalMatrixViewModel } from "./eval-matrix-types";
import { createReadyEvalMatrixViewModel } from "./eval-matrix-view-model";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe("EvalMatrixClient LLM configuration", () => {
  it("resets the selected model when switching suites", () => {
    renderClient();

    changeSelect(getLlmVariantSelect(), "o3");
    expect(getLlmVariantSelect().value).toBe("o3");

    changeSelect(getEvalSuiteSelect(), GENERATE_ADVENTURE_EVAL_SUITE_ID);

    expect(getLlmVariantSelect().value).toBe("o4-mini");
  });

  it("sends the selected model with full-suite run actions and keeps the selector disabled while pending", async () => {
    const pendingRun = createPendingRun();
    const runSelectedEvalSuite = vi.fn(() => pendingRun.promise);
    renderClient({ runSelectedEvalSuite });

    changeSelect(getLlmVariantSelect(), "o3");
    click(getButton("Run all 4 test cases"));

    expect(runSelectedEvalSuite).toHaveBeenCalledWith(
      GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      { model: "o3" },
    );
    expect(getLlmVariantSelect().value).toBe("o3");
    expect(getLlmVariantSelect().disabled).toBe(true);

    await act(async () => {
      pendingRun.resolve(createBlockedResult());
      await pendingRun.promise;
    });
  });

  it("sends the selected model with selected-test-case run actions", async () => {
    const runSelectedEvalSuite = vi.fn().mockResolvedValue(createBlockedResult());
    renderClient({ runSelectedEvalSuite });

    changeSelect(getLlmVariantSelect(), "gpt-4.1");
    changeSelect(getRunScopeSelect(), "test_case");
    changeSelect(getTestCaseSelect(), "high-stakes-finance");
    await clickAsync(getButton("Run 1 test case"));

    expect(runSelectedEvalSuite).toHaveBeenCalledWith(
      GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      { testCaseId: "high-stakes-finance", model: "gpt-4.1" },
    );
  });
});

function renderClient(options: {
  runSelectedEvalSuite?: (suiteId: string, scope?: { testCaseId?: string; model?: string }) => Promise<EvalRunResult>;
} = {}) {
  const readyViewModels = createReadyViewModels();

  act(() => {
    root.render(
      <EvalMatrixClient
        initialViewModel={readyViewModels[0]}
        readyViewModels={readyViewModels}
        runSelectedEvalSuite={options.runSelectedEvalSuite ?? vi.fn().mockResolvedValue(createBlockedResult())}
      />,
    );
  });
}

function createReadyViewModels(): EvalMatrixViewModel[] {
  const suites = createSuites();
  return suites.map((suite) => createReadyEvalMatrixViewModel(suites, suite.id));
}

function createSuites(): EvalSuiteSummary[] {
  return [
    {
      id: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
      name: "Game Master Interview",
      shortDescription: "Checks focused, useful interview turns.",
      purpose: "Checks focused Game Master interview behavior.",
      readyTestCases: [
        { id: "become-a-chef-initial", name: "become-a-chef-initial", inputVariables: { topic: "baking", initial: "true" } },
        { id: "become-a-chef", name: "become-a-chef", inputVariables: { topic: "baking" } },
        { id: "high-stakes-finance", name: "high-stakes-finance", inputVariables: { topic: "finance" } },
        { id: "learn-a-language", name: "learn-a-language", inputVariables: { topic: "language learning" } },
      ],
      defaultVariantLabel: "gpt-5.4-mini",
      defaultModelLabel: "gpt-5.4-mini",
      defaultModel: "gpt-5.4-mini",
      llmConfiguration: buildEvalLlmConfiguration("gpt-5.4-mini"),
    },
    {
      id: GENERATE_ADVENTURE_EVAL_SUITE_ID,
      name: "Generate Adventure",
      shortDescription: "Checks full playable roadmap generation.",
      purpose: "Checks full Adventure generation from interview context.",
      readyTestCases: [
        { id: "learn-a-skill", name: "learn-a-skill", inputVariables: { goal: "Spanish coffee chat" } },
      ],
      defaultVariantLabel: "o4-mini",
      defaultModelLabel: "o4-mini",
      defaultModel: "o4-mini",
      llmConfiguration: buildEvalLlmConfiguration("o4-mini"),
    },
  ];
}

function createBlockedResult(): EvalRunResult {
  return {
    suiteId: GAME_MASTER_INTERVIEW_EVAL_SUITE_ID,
    status: "blocked",
    summary: "Local configuration is missing or invalid.",
    diagnostics: [
      {
        scope: "configuration",
        code: "test_blocker",
        message: "Blocked in test.",
      },
    ],
    blocker: "test_blocker",
    durationMs: 1,
  };
}

function createPendingRun() {
  let resolve!: (result: EvalRunResult) => void;
  const promise = new Promise<EvalRunResult>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

function getEvalSuiteSelect(): HTMLSelectElement {
  const select = Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes("Eval Suite"),
  )?.querySelector("select");

  return requireSelect(select, "Eval Suite");
}

function getLlmVariantSelect(): HTMLSelectElement {
  const heading = container.querySelector("#eval-llm-configuration-heading");
  const section = heading?.closest("section");
  const select = section?.querySelector("select");

  return requireSelect(select, "LLM Configuration Variant");
}

function getRunScopeSelect(): HTMLSelectElement {
  const select = Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes("Run scope"),
  )?.querySelector("select");

  return requireSelect(select, "Run scope");
}

function getTestCaseSelect(): HTMLSelectElement {
  const select = Array.from(container.querySelectorAll("label")).find((label) =>
    label.textContent?.includes("Test case"),
  )?.querySelector("select");

  return requireSelect(select, "Test case");
}

function requireSelect(select: HTMLSelectElement | null | undefined, label: string): HTMLSelectElement {
  if (!select) {
    throw new Error(`Expected ${label} select.`);
  }

  return select;
}

function getButton(text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent === text,
  );

  if (!button) {
    throw new Error(`Expected button ${text}.`);
  }

  return button;
}

function changeSelect(select: HTMLSelectElement, value: string) {
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function click(button: HTMLButtonElement) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function clickAsync(button: HTMLButtonElement) {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
