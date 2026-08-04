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
      steps: [
        { key: "choose-recipe", description: "Pick one recipe that fits your weeknight time window.", sequenceNumber: 1 },
        { key: "write-shopping-list", description: "Write every ingredient and tool needed before shopping.", sequenceNumber: 2 },
        { key: "confirm-cooking-window", description: "Choose the evening and start time for cooking the meal.", sequenceNumber: 3 },
      ],
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


  it("requires 2 to 7 non-empty Quest Steps for Main and Side Quests", () => {
    const payload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [{ ...payload.acts[0], mainQuests: [{ ...payload.acts[0].mainQuests[0], steps: undefined }] }],
      }),
    ).toThrow("steps");

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            sideQuests: [{ ...payload.acts[0].sideQuests[0], steps: [{ key: "only-step", description: "Do one thing." }] }],
          },
        ],
      }),
    ).toThrow("between 2 and 7");

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            mainQuests: [
              {
                ...payload.acts[0].mainQuests[0],
                steps: Array.from({ length: 8 }, (_, index) => ({ key: `step-${index + 1}`, description: `Do concrete thing ${index + 1}.` })),
              },
            ],
          },
        ],
      }),
    ).toThrow("between 2 and 7");

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            mainQuests: [
              {
                ...payload.acts[0].mainQuests[0],
                steps: [{ key: "valid", description: "Do a concrete thing." }, { key: "blank", description: " " }],
              },
            ],
          },
        ],
      }),
    ).toThrow("description");
  });

  it("rejects duplicate step keys within each Quest", () => {
    const payload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            mainQuests: [
              {
                ...payload.acts[0].mainQuests[0],
                steps: [{ key: "same-step", description: "Do the first thing." }, { key: "same-step", description: "Do the second thing." }],
              },
            ],
          },
        ],
      }),
    ).toThrow("duplicate key");
  });

  it("rejects Boss Fight steps", () => {
    const payload = buildGeneratedAdventureContentBoundaryPayload();

    expect(() =>
      parseGeneratedAdventureContent({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            bossFights: [
              {
                ...payload.acts[0].bossFights[0],
                steps: [{ key: "prepare", description: "Prepare for the milestone." }, { key: "prove", description: "Complete the milestone proof." }],
              },
            ],
          },
        ],
      }),
    ).toThrow("must not include Quest Steps");
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
