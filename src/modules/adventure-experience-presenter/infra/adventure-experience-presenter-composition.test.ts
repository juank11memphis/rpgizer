import { describe, expect, it } from "vitest";

import { createAdventureExperiencePresenterComposition } from "./adventure-experience-presenter-composition";
import type { AdventureDetailContentReader } from "../application/get-adventure-detail-menu/ports";

describe("createAdventureExperiencePresenterComposition", () => {
  it("exposes getAdventureDetailMenu with injectable reader dependencies", async () => {
    const contentReader: AdventureDetailContentReader = {
      findGeneratedAdventureForDisplay: async () => ({ status: "not_ready" }),
    };
    const composition = createAdventureExperiencePresenterComposition({ contentReader });

    await expect(
      composition.getAdventureDetailMenu({ userId: "user-1", adventureId: "adventure-1" }),
    ).resolves.toEqual({ status: "not_ready" });
  });
});
