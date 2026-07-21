/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EvalCellDetailDrawer } from "./eval-cell-detail-drawer";
import type { EvalMatrixShellCell } from "./eval-matrix-types";

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

describe("EvalCellDetailDrawer", () => {
  it("renders a dim overlay and wider desktop drawer while preserving dialog semantics", () => {
    renderDrawer();

    const overlay = getOverlay();
    const dialog = getDialog();

    expect(overlay.className).toContain("bg-slate-950/70");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.className).toContain("max-h-[88vh]");
    expect(dialog.className).toContain("md:w-[80vw]");
    expect(dialog.className).toContain("md:max-w-[72rem]");
  });

  it("closes with the close button and Escape key", () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    click(getButton("Close cell detail"));
    expect(onClose).toHaveBeenCalledTimes(1);

    keyDown(getDialog(), "Escape");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes on outside click but not when clicking inside the drawer", () => {
    const onClose = vi.fn();
    renderDrawer({ onClose });

    click(getDialog());
    expect(onClose).not.toHaveBeenCalled();

    click(getOverlay());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves initial focus to the close button and traps Tab focus inside the drawer", () => {
    renderDrawer();

    const closeButton = getButton("Close cell detail");
    expect(document.activeElement).toBe(closeButton);

    const focusableElements = getDialog().querySelectorAll<HTMLElement>(
      'button:not([disabled]), details summary, [tabindex]:not([tabindex="-1"])',
    );
    const lastFocusableElement = focusableElements[focusableElements.length - 1];
    lastFocusableElement.focus();

    keyDown(getDialog(), "Tab");
    expect(document.activeElement).toBe(closeButton);

    keyDown(getDialog(), "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(lastFocusableElement);
  });

  it("copies Output and shows visible success feedback", async () => {
    const writeText = stubClipboardSuccess();
    renderDrawer();

    await clickAsync(getButton("Copy output"));

    expect(writeText).toHaveBeenCalledWith("Generated output\nline two");
    expect(getButton("Copy output").textContent).toBe("Copied");
  });

  it("copies Expected / Golden and shows visible failure feedback", async () => {
    const writeText = stubClipboardFailure();
    renderDrawer();

    await clickAsync(getButton("Copy expected / golden"));

    expect(writeText).toHaveBeenCalledWith("Expected safer framing.");
    expect(getButton("Copy expected / golden").textContent).toBe("Copy failed");
  });

  it("keeps raw artifacts collapsed by default and copies expanded artifact content", async () => {
    const writeText = stubClipboardSuccess();
    renderDrawer();

    const details = Array.from(container.querySelectorAll("details"));
    expect(details.length).toBeGreaterThan(0);
    expect(details.some((element) => element.open)).toBe(false);
    expect(container.textContent).toContain("Raw response · Local only");

    details.find((element) => element.textContent?.includes("Raw response"))!.open = true;
    await clickAsync(getButton("Copy raw artifact Raw response"));

    expect(writeText).toHaveBeenCalledWith("Raw response payload");
    expect(getButton("Copy raw artifact Raw response").textContent).toBe("Copied");
  });
});

function renderDrawer(options: { onClose?: () => void; cell?: EvalMatrixShellCell } = {}) {
  act(() => {
    root.render(
      <EvalCellDetailDrawer
        cell={options.cell ?? createCell()}
        onClose={options.onClose ?? vi.fn()}
      />,
    );
  });
}

function createCell(): EvalMatrixShellCell {
  return {
    id: "learn-a-skill::default",
    testCaseId: "learn-a-skill",
    testCaseName: "Learn A Skill",
    testCaseInputSummary: "goal=Spanish coffee chat",
    variantId: "default",
    variantName: "Default variant",
    variantModelLabel: "Default model",
    status: "passed",
    statusLabel: "Passed",
    assertionSummary: "Passed · 2/2 assertions",
    metricSummary: "Latency not reported · tokens not reported · cost not reported",
    diagnosticsSummary: "No diagnostics",
    outputPreview: "Generated output",
    detail: {
      outputMarkdown: "Generated output\nline two",
      expectedGolden: "Expected safer framing.",
      metrics: {
        latency: { reported: false, unit: "ms" },
        tokens: { reported: false, unit: "tokens" },
        cost: { reported: false, unit: "usd" },
      },
      assertions: [
        { id: "required-shape", label: "Required shape", status: "passed" },
        { id: "safety", label: "Safety", status: "passed" },
      ],
      diagnostics: [],
      artifacts: [
        {
          id: "expected-golden",
          label: "Expected / Golden",
          localOnly: true,
          redactionState: "redacted",
          value: "Expected safer framing.",
        },
        {
          id: "raw-response",
          label: "Raw response",
          localOnly: true,
          redactionState: "redacted",
          value: "Raw response payload",
        },
      ],
    },
  };
}

function getOverlay(): HTMLElement {
  const overlay = container.firstElementChild;

  if (!(overlay instanceof HTMLElement)) {
    throw new Error("Expected drawer overlay to render.");
  }

  return overlay;
}

function getDialog(): HTMLElement {
  const dialog = container.querySelector<HTMLElement>('[role="dialog"]');

  if (!dialog) {
    throw new Error("Expected drawer dialog to render.");
  }

  return dialog;
}

function getButton(ariaLabel: string): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`);

  if (!button) {
    throw new Error(`Expected button with aria-label "${ariaLabel}" to render.`);
  }

  return button;
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function clickAsync(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function keyDown(element: Element, key: string, options: { shiftKey?: boolean } = {}) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key, shiftKey: options.shiftKey ?? false }));
  });
}

function stubClipboardSuccess() {
  const writeText = vi.fn<Clipboard["writeText"]>().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  return writeText;
}

function stubClipboardFailure() {
  const writeText = vi.fn<Clipboard["writeText"]>().mockRejectedValue(new Error("clipboard unavailable"));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  return writeText;
}
