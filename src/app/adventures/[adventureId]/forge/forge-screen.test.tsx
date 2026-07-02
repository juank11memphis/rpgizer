import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ForgeFailure } from "./forge-failure";
import { ForgeLoading } from "./forge-loading";
import { ForgeReady } from "./forge-ready";

const forbiddenUserTerms = /artifact-|artifact id|raw json|provider|model|schema|backend|duplicate generation/i;

function renderMarkup(node: React.ReactNode): string {
  return renderToStaticMarkup(node);
}

describe("forge route screens", () => {
  it("renders the magical loading ritual without internal technical labels", () => {
    const markup = renderMarkup(<ForgeLoading />);

    expect(markup).toContain("The forge is lit");
    expect(markup).toContain("Forging your Adventure foundation...");
    expect(markup).toContain(
      "The Game Master is distilling your answers into a clear starting point.",
    );
    expect(markup).toContain("Reading the quest notes...");
    expect(markup).toContain("Tempering your goal...");
    expect(markup).toContain("Binding constraints and resources...");
    expect(markup).toContain("Sealing the foundation...");
    expect(markup).not.toMatch(/\b\d+%/);
    expect(markup).not.toMatch(forbiddenUserTerms);
  });

  it("renders the ready state with the approved expectation-setting copy and action", () => {
    const markup = renderMarkup(<ForgeReady />);

    expect(markup).toContain("Forge complete");
    expect(markup).toContain("Interview output ready.");
    expect(markup).toContain("Your Adventure foundation is prepared. More to come soon.");
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain("Back to Dashboard");
    expect(markup).not.toMatch(/Roadmap ready|Quests ready|Adventure complete/i);
    expect(markup).not.toMatch(forbiddenUserTerms);
  });

  it("renders the recoverable failure state with retry and dashboard actions", () => {
    const markup = renderMarkup(<ForgeFailure adventureId="adventure-1" />);

    expect(markup).toContain("The forge sputtered");
    expect(markup).toContain("Couldn’t finish the forge.");
    expect(markup).toContain("Your interview is safe. Try again when you’re ready.");
    expect(markup).toContain('name="adventureId"');
    expect(markup).toContain('value="adventure-1"');
    expect(markup).toContain("Try Again");
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain("Back to Dashboard");
    expect(markup).not.toMatch(forbiddenUserTerms);
  });

  it("does not duplicate the failure heading in user-facing failure body copy", () => {
    const markup = renderMarkup(
      <ForgeFailure
        adventureId="adventure-1"
        message="Your interview is safe. Try again when you’re ready."
      />,
    );

    expect(markup.match(/Couldn’t finish the forge\./g)).toHaveLength(1);
    expect(markup.match(/Your interview is safe\. Try again when you’re ready\./g)).toHaveLength(1);
  });
});
