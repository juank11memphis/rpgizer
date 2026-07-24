/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdventureForgedToast } from "./adventure-forged-toast";

const routerReplace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  usePathname: () => "/adventures/adventure-1",
  useRouter: () => ({ replace: routerReplace }),
  useSearchParams: () => currentSearchParams,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  routerReplace.mockReset();
  currentSearchParams = new URLSearchParams();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AdventureForgedToast", () => {
  it("shows the success toast once and clears the redirect signal", async () => {
    currentSearchParams = new URLSearchParams("forged=1");

    await renderToast();

    expect(container.textContent).toContain("Adventure forged.");
    expect(routerReplace).toHaveBeenCalledWith("/adventures/adventure-1", { scroll: false });

    currentSearchParams = new URLSearchParams();
    await renderToast();

    act(() => {
      vi.advanceTimersByTime(4_000);
    });

    expect(container.textContent).not.toContain("Adventure forged.");
  });

  it("does not replay the toast without a fresh success signal", async () => {
    await renderToast();

    expect(container.textContent).not.toContain("Adventure forged.");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("does not expose raw technical details", async () => {
    currentSearchParams = new URLSearchParams("forged=1&debug=provider&generatedAdventureId=generated-adventure-1");

    await renderToast();

    expect(container.textContent).toContain("Adventure forged.");
    expect(container.textContent).not.toMatch(/provider|generated-adventure|debug|raw|backend/i);
    expect(routerReplace).toHaveBeenCalledWith("/adventures/adventure-1?debug=provider&generatedAdventureId=generated-adventure-1", { scroll: false });
  });
});

async function renderToast() {
  await act(async () => {
    root.render(<AdventureForgedToast />);
  });
}
