import { describe, expect, it } from "vitest";

import { getAdventureDetailMenu } from "./usecase";
import type { AdventureDetailContentReader } from "./ports";

describe("getAdventureDetailMenu", () => {
  const input = { userId: "user-1", adventureId: "adventure-1" };

  it("returns not_found for missing or non-owned Adventure content", async () => {
    const contentReader: AdventureDetailContentReader = {
      findGeneratedAdventureForDisplay: async () => ({ status: "not_found" }),
    };

    await expect(getAdventureDetailMenu(input, { contentReader })).resolves.toEqual({
      status: "not_found",
    });
  });

  it("returns not_ready when the reader can distinguish an owned Adventure without content", async () => {
    const contentReader: AdventureDetailContentReader = {
      findGeneratedAdventureForDisplay: async () => ({ status: "not_ready" }),
    };

    await expect(getAdventureDetailMenu(input, { contentReader })).resolves.toEqual({
      status: "not_ready",
    });
  });

  it("maps found content into the presenter-owned menu view", async () => {
    const contentReader: AdventureDetailContentReader = {
      findGeneratedAdventureForDisplay: async () => ({
        status: "found",
        content: {
          title: "Adventure Title",
          themeSummary: null,
          goalSummary: "Goal summary.",
          safetyNotes: [],
          acts: [],
          skills: [],
          inventoryItems: [],
          achievements: [],
        },
      }),
    };

    const result = await getAdventureDetailMenu(input, { contentReader });

    expect(result).toMatchObject({
      status: "found",
      menu: {
        header: { title: "Adventure Title", themeSummary: null, goalSummary: "Goal summary." },
        journal: { label: "Journal" },
        inventory: { label: "Inventory" },
        character: { label: "Character" },
        achievements: { label: "Achievements" },
      },
    });
  });
});
