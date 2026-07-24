/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createForgeSseEnvelope } from "./events/forge-sse";
import {
  applyForgeProgressEvent,
  buildForgeRoadStageViews,
  createInitialForgeProgressSnapshot,
} from "./forge-progress-model";
import { ForgeProgressClient } from "./forge-progress-client";
import { ForgeProgressScreen } from "./forge-progress-screen";
import type { ForgeConnectionViewState, ForgeProgressSnapshot } from "./forge-progress-types";

const forbiddenUserTerms = /artifact-|artifact id|raw json|provider|model|schema|backend|duplicate generation|quest_lore|adventure_roadmap|xp_rewards|generated-adventure|adventure-1/i;
const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

let container: HTMLDivElement;
let root: Root;
let eventSources: MockEventSource[];

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  eventSources = [];
  routerPush.mockReset();
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("EventSource", MockEventSource);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Forge Road progress screen", () => {
  it("renders all five stages from the start without normal progress actions", () => {
    const markup = renderStaticProgress();

    expect(markup).toContain("RPGizer");
    expect(markup).toContain("Forging Adventure");
    expect(markup).toContain("Gathering your quest lore");
    expect(markup).toContain("Building your adventure roadmap");
    expect(markup).toContain("Connecting quests, skills, and inventory");
    expect(markup).toContain("Balancing XP and rewards");
    expect(markup).toContain("Opening your adventure");
    expect(markup).toContain("Keep this window open while your Adventure is forged.");
    expect(markup).toContain("Now");
    expect(markup).toContain("Next");
    expect(markup).not.toContain("Try again");
    expect(markup).not.toContain("Back to interview");
    expect(visibleText(markup)).not.toMatch(/\b\d+%/);
    expect(visibleText(markup)).not.toMatch(forbiddenUserTerms);
  });

  it("renders completed, current, and future text states independent of animation", () => {
    const snapshot = applyForgeProgressEvent(createInitialForgeProgressSnapshot(), {
      stage: "connections",
      status: "started",
    });
    const markup = renderStaticProgress(snapshot);

    expect(markup.match(/Complete/g)?.length).toBeGreaterThanOrEqual(2);
    expect(markup).toContain("Connecting quests, skills, and inventory");
    expect(markup).toContain("Now");
    expect(markup).toContain("Next");
    expect(markup).toContain("motion-reduce:animate-none");
    expect(markup).toContain("data-stage=\"connections\"");
    expect(markup).toContain("motion-safe:transition-all");
  });

  it("renders the paused state with recovery actions only when needed", () => {
    const markup = renderStaticProgress(createInitialForgeProgressSnapshot(), "paused");

    expect(markup).toContain("Forge paused");
    expect(markup).toContain("The forge needs another spark.");
    expect(markup).toContain("Your interview is safe. Try again, or return to adjust your answers.");
    expect(markup).toContain("Try again");
    expect(markup).toContain("Back to interview");
    expect(visibleText(markup)).not.toMatch(forbiddenUserTerms);
  });
});

describe("ForgeProgressClient", () => {
  it("opens one EventSource to the forge events route and closes on unmount", async () => {
    await renderClient();

    expect(eventSources).toHaveLength(1);
    expect(eventSources[0].url).toBe("/adventures/adventure-1/forge/events");

    act(() => {
      root.unmount();
    });

    expect(eventSources[0].closed).toBe(true);
  });

  it("updates the visible stage from valid progress events", async () => {
    await renderClient();

    act(() => {
      eventSources[0].emit("progress", envelope({ stage: "adventure_roadmap", status: "started" }));
    });

    expect(container.textContent).toContain("Building your adventure roadmap");
    expect(getTravelerStage()).toBe("adventure_roadmap");
    expect(container.textContent).toContain("Complete");
    expect(container.textContent).not.toMatch(forbiddenUserTerms);
  });

  it("shows calm reconnecting copy without recovery actions", async () => {
    await renderClient();

    await act(async () => {
      eventSources[0].failTransport();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Still forging…");
    expect(container.textContent).not.toContain("Try again");
    expect(container.textContent).not.toContain("Back to interview");
  });

  it("closes and redirects on terminal complete", async () => {
    await renderClient();

    act(() => {
      eventSources[0].emit(
        "complete",
        envelope({
          adventureId: "adventure-1",
          generatedAdventureId: "generated-adventure-1",
          destination: "/adventures/adventure-1",
        }),
      );
    });

    expect(eventSources[0].closed).toBe(true);
    expect(routerPush).toHaveBeenCalledWith("/adventures/adventure-1?forged=1");
  });

  it("closes and shows paused recovery on terminal error", async () => {
    await renderClient();

    await act(async () => {
      eventSources[0].emit("error", envelope({ message: "Safe message", canRetry: true }));
      await Promise.resolve();
    });

    expect(eventSources[0].closed).toBe(true);
    expect(container.textContent).toContain("The forge needs another spark.");
    expect(container.textContent).toContain("Try again");
    expect(getLinkHref("Back to interview")).toBe("/adventures/adventure-1/interview");
    expect(container.textContent).not.toMatch(forbiddenUserTerms);
  });

  it("uses the same safe recovery state for malformed terminal error payloads", async () => {
    await renderClient();

    await act(async () => {
      eventSources[0].emit("error", "not-json provider stack trace");
      await Promise.resolve();
    });

    expect(eventSources[0].closed).toBe(true);
    expect(container.textContent).toContain("The forge needs another spark.");
    expect(container.textContent).toContain("Your interview is safe. Try again, or return to adjust your answers.");
    expect(container.textContent).not.toMatch(/not-json|provider|stack trace/i);
  });

  it("restarts the EventSource connection when Try again is selected", async () => {
    await renderClient();

    await act(async () => {
      eventSources[0].emit("error", envelope({ message: "Safe message", canRetry: true }));
      await Promise.resolve();
    });
    clickButton("Try again");

    expect(eventSources).toHaveLength(2);
    expect(eventSources[0].closed).toBe(true);
    expect(eventSources[1].closed).toBe(false);
    expect(eventSources[1].url).toBe("/adventures/adventure-1/forge/events?retry=1");
    expect(container.textContent).toContain("Gathering your quest lore");
    expect(container.textContent).not.toContain("Back to interview");
  });


  it("can run a hard-coded traveler test without opening EventSource", async () => {
    await act(async () => {
      root.render(
        <ForgeProgressClient
          adventureId="adventure-1"
          eventsUrl="/adventures/adventure-1/forge/events"
          travelerTestMode
        />,
      );
    });

    expect(eventSources).toHaveLength(0);
    expect(getTravelerStage()).toBe("quest_lore");

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(getTravelerStage()).toBe("adventure_roadmap");

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      await Promise.resolve();
    });

    expect(getTravelerStage()).toBe("connections");
  });

  it("resets the stall timer after valid progress", async () => {
    await renderClient();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      eventSources[0].emit("progress", envelope({ stage: "adventure_roadmap", status: "started" }));
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(eventSources[0].closed).toBe(false);
    expect(container.textContent).toContain("Building your adventure roadmap");
    expect(container.textContent).not.toContain("Try again");

    await act(async () => {
      vi.advanceTimersByTime(15_000);
      await Promise.resolve();
    });

    expect(eventSources[0].closed).toBe(true);
    expect(container.textContent).toContain("The forge needs another spark.");
  });

  it("shows paused recovery after a client stall threshold", async () => {
    await renderClient();

    await act(async () => {
      vi.advanceTimersByTime(75_000);
      await Promise.resolve();
    });

    expect(eventSources[0].closed).toBe(true);
    expect(container.textContent).toContain("The forge needs another spark.");
  });
});


function visibleText(markup: string): string {
  return markup.replace(/<[^>]*>/g, " ");
}

function renderStaticProgress(
  snapshot: ForgeProgressSnapshot = createInitialForgeProgressSnapshot(),
  connectionState: ForgeConnectionViewState = "progress",
): string {
  return renderToStaticMarkup(
    <ForgeProgressScreen
      adventureId="adventure-safe"
      stages={buildForgeRoadStageViews(snapshot)}
      connectionState={connectionState}
      onTryAgain={() => undefined}
    />,
  );
}

async function renderClient() {
  await act(async () => {
    root.render(
      <ForgeProgressClient
        adventureId="adventure-1"
        eventsUrl="/adventures/adventure-1/forge/events"
      />,
    );
  });
}

function envelope(data: unknown): string {
  return JSON.stringify(
    createForgeSseEnvelope({
      adventureId: "adventure-1",
      sequence: 1,
      timestamp: "2026-07-24T00:00:00.000Z",
      data,
    }),
  );
}


function getTravelerStage(): string | null {
  return container.querySelector('[data-testid="cloaked-traveler"]')?.getAttribute("data-stage") ?? null;
}

function getLinkHref(label: string): string | null {
  const link = Array.from(container.querySelectorAll("a")).find(
    (candidate) => candidate.textContent === label,
  );

  return link?.getAttribute("href") ?? null;
}

function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );

  if (!button) {
    throw new Error(`Missing button: ${label}`);
  }

  act(() => {
    button.click();
  });
}

class MockEventSource {
  readonly listeners = new Map<string, Array<(event: Event) => void>>();
  closed = false;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    eventSources.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data }));
    }
  }

  failTransport() {
    for (const listener of this.listeners.get("error") ?? []) {
      listener(new Event("error"));
    }
    this.onerror?.();
  }
}
