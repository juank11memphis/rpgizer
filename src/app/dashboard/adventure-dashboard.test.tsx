import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdventureDashboard } from "./adventure-dashboard";

function renderDashboardMarkup(
  props: Parameters<typeof AdventureDashboard>[0],
): string {
  return renderToStaticMarkup(<AdventureDashboard {...props} />);
}

describe("AdventureDashboard", () => {
  it("renders the empty Quest Log state with a Start Adventure action", () => {
    const markup = renderDashboardMarkup({ draft: null });

    expect(markup).toContain("Welcome, adventurer.");
    expect(markup).toContain("Quest Log");
    expect(markup).toContain("No adventures yet.");
    expect(markup).toContain("Start with one real goal.");
    expect(markup).toContain('href="/adventures/new"');
    expect(markup).toContain("Start Adventure");
    expect(markup).not.toContain("Continue Draft");
    expect(markup).not.toContain("Start New Adventure");
  });

  it("renders the active draft state with continue and secondary start actions", () => {
    const markup = renderDashboardMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    });

    expect(markup).toContain("Welcome back.");
    expect(markup).toContain("Adventure Draft");
    expect(markup).toContain("Become a chef");
    expect(markup).toContain("Interview in progress");
    expect(markup).toContain('href="/adventures/adventure-1/interview"');
    expect(markup).toContain("Continue Draft");
    expect(markup).toContain('href="/adventures/new"');
    expect(markup).toContain("Start New Adventure");
    expect(markup).not.toContain("No adventures yet.");
  });

  it("does not render unrelated rich dashboard features", () => {
    const markup = renderDashboardMarkup({
      draft: {
        id: "adventure-1",
        goalText: "Become a chef",
        state: "drafting",
        readinessStatus: "not_ready",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    });

    expect(markup).not.toMatch(/stats/i);
    expect(markup).not.toMatch(/filters/i);
    expect(markup).not.toMatch(/history/i);
    expect(markup).not.toMatch(/account settings/i);
  });
});
