import { describe, expect, it } from "vitest";

import { buildGeneratedAdventureContentBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventureContent } from "./generated-adventure-content";

describe("parseGeneratedAdventureContent", () => {
  it("accepts unlinked generated Adventure content and applies generated defaults", () => {
    const content = parseGeneratedAdventureContent({
      ...buildGeneratedAdventureContentBoundaryPayload(),
      title: "  The Hearthfire Cooking Quest  ",
    });

    expect(content.title).toBe("The Hearthfire Cooking Quest");
    expect(content.acts[0].mainQuests[0]).toMatchObject({
      key: "plan-first-menu",
      type: "main",
      status: "not_started",
      sequenceNumber: 1,
    });
    expect(content.acts[0].mainQuests[0]).not.toHaveProperty("skillRewards");
    expect(content.acts[0].mainQuests[0]).not.toHaveProperty("inventoryItemKeys");
    expect(content.skills[0]).toMatchObject({ xp: 0, level: 1 });
    expect(content.inventoryItems[0]).toMatchObject({ status: "needed", acquiredAt: null });
  });

  it("rejects malformed content before dependency linking", () => {
    expect(() => parseGeneratedAdventureContent(null)).toThrow("must be an object");
    expect(() =>
      parseGeneratedAdventureContent({ ...buildGeneratedAdventureContentBoundaryPayload(), title: " " }),
    ).toThrow("title");
    expect(() =>
      parseGeneratedAdventureContent({ ...buildGeneratedAdventureContentBoundaryPayload(), acts: [] }),
    ).toThrow("acts");
  });

  it("rejects duplicate stable keys", () => {
    const payload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        skills: [payload.skills[0], { ...payload.skills[0] }],
      }),
    ).toThrow("duplicate key");
  });

  it("rejects dependency fields on unlinked Quests and Boss Fights", () => {
    const finalLikePayload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...finalLikePayload,
        acts: [
          {
            ...finalLikePayload.acts[0],
            mainQuests: [
              {
                ...finalLikePayload.acts[0].mainQuests[0],
                skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
              },
            ],
          },
        ],
      }),
    ).toThrow("must not include dependency or XP fields");

    expect(() =>
      parseGeneratedAdventureContent({
        ...finalLikePayload,
        acts: [
          {
            ...finalLikePayload.acts[0],
            bossFights: [
              {
                ...finalLikePayload.acts[0].bossFights[0],
                inventoryItemKeys: ["weekly-menu-template"],
              },
            ],
          },
        ],
      }),
    ).toThrow("must not include dependency or XP fields");
  });

  it("rejects blank Quest and Boss Fight done conditions", () => {
    const payload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            mainQuests: [{ ...payload.acts[0].mainQuests[0], doneCondition: " " }],
          },
        ],
      }),
    ).toThrow("doneCondition");

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            bossFights: [{ ...payload.acts[0].bossFights[0], doneCondition: "" }],
          },
        ],
      }),
    ).toThrow("doneCondition");
  });
});
