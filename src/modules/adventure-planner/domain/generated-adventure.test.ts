import { describe, expect, it } from "vitest";

import { buildGeneratedAdventureBoundaryPayload } from "../application/test/generated-adventure-fixtures";
import { parseGeneratedAdventure } from "./generated-adventure";

describe("parseGeneratedAdventure", () => {
  it("accepts a complete generated Adventure and applies progression-ready defaults", () => {
    const adventure = parseGeneratedAdventure({
      ...buildGeneratedAdventureBoundaryPayload(),
      title: "  The Hearthfire Cooking Quest  ",
    });

    expect(adventure).toMatchObject({
      title: "The Hearthfire Cooking Quest",
      themeSummary: "A cozy guild journey toward reliable weeknight cooking.",
      goalSummary: "Become confident preparing three practical dinners without stress.",
      safetyNotes: ["Keep guidance educational and avoid medical nutrition advice."],
      skills: [
        {
          key: "meal-planning",
          name: "Meal Planning",
          description: "Choose recipes and shop with realistic weeknight constraints.",
          xp: 0,
          level: 1,
        },
        {
          key: "knife-basics",
          name: "Knife Basics",
          description: "Prepare ingredients safely and efficiently.",
          xp: 0,
          level: 1,
        },
      ],
      inventoryItems: [
        {
          key: "weekly-menu-template",
          name: "Weekly Menu Template",
          purpose: "A simple planning sheet for choosing dinners before shopping.",
          status: "needed",
          acquiredAt: null,
          sequenceNumber: 1,
        },
        {
          key: "sharp-chefs-knife",
          name: "Sharp Chef's Knife",
          purpose: "A practical tool that makes prep safer and faster.",
          status: "needed",
          acquiredAt: null,
          sequenceNumber: 2,
        },
      ],
      achievements: [
        {
          key: "three-dinner-streak",
          name: "Three Dinner Streak",
          description: "Recognizes completing three planned weeknight dinners.",
          unlockCondition: "Complete three main cooking quests in one week.",
          status: "locked",
          unlockedAt: null,
          sequenceNumber: 1,
        },
      ],
      focusedNextActions: [
        {
          title: "Pick the first dinner",
          description: "Choose one simple recipe and list the ingredients needed for it.",
          sequenceNumber: 1,
        },
      ],
      acts: [
        {
          key: "act-setup",
          title: "Stock the Hearth",
          summary: "Prepare the first routines and tools for calm weeknight cooking.",
          sequenceNumber: 1,
          mainQuests: [
            {
              key: "plan-first-menu",
              type: "main",
              status: "not_started",
              sequenceNumber: 1,
              steps: [
                { key: "choose-recipe", description: "Pick one recipe that fits your weeknight time window.", sequenceNumber: 1 },
                { key: "write-shopping-list", description: "Write every ingredient and tool needed before shopping.", sequenceNumber: 2 },
                { key: "confirm-cooking-window", description: "Choose the evening and start time for cooking the meal.", sequenceNumber: 3 },
              ],
              skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
              inventoryItemKeys: ["weekly-menu-template"],
            },
          ],
          sideQuests: [
            {
              key: "prep-station-reset",
              type: "side",
              status: "not_started",
              sequenceNumber: 1,
              steps: [
                { key: "clear-counter", description: "Clear enough counter space for safe chopping and staging.", sequenceNumber: 1 },
                { key: "stage-tools", description: "Place the knife, board, pan, and template within reach.", sequenceNumber: 2 },
              ],
            },
          ],
          bossFights: [
            {
              key: "first-weeknight-service",
              status: "not_started",
              sequenceNumber: 1,
              skillRewards: [
                { skillKey: "meal-planning", xp: 40 },
                { skillKey: "knife-basics", xp: 20 },
              ],
              inventoryItemKeys: ["weekly-menu-template", "sharp-chefs-knife"],
            },
          ],
        },
      ],
    });
  });

  it("rejects missing, wrong-shaped, or blank required fields", () => {
    expect(() => parseGeneratedAdventure(null)).toThrow("must be an object");
    expect(() =>
      parseGeneratedAdventure({ ...buildGeneratedAdventureBoundaryPayload(), title: " " }),
    ).toThrow("title");
    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        acts: [{ ...buildGeneratedAdventureBoundaryPayload().acts[0], title: "" }],
      }),
    ).toThrow("title");
    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        skills: [{ key: "meal-planning", name: "Meal Planning" }],
      }),
    ).toThrow("description");
  });

  it("rejects missing required generated Adventure collections", () => {
    for (const collection of [
      "acts",
      "skills",
      "inventoryItems",
      "achievements",
      "focusedNextActions",
    ]) {
      expect(() =>
        parseGeneratedAdventure({ ...buildGeneratedAdventureBoundaryPayload(), [collection]: [] }),
      ).toThrow(collection);
    }

    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        acts: [{ ...buildGeneratedAdventureBoundaryPayload().acts[0], mainQuests: [] }],
      }),
    ).toThrow("mainQuests");
    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        acts: [{ ...buildGeneratedAdventureBoundaryPayload().acts[0], sideQuests: [] }],
      }),
    ).toThrow("sideQuests");
    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        acts: [{ ...buildGeneratedAdventureBoundaryPayload().acts[0], bossFights: [] }],
      }),
    ).toThrow("bossFights");
  });

  it("rejects Quests and Boss Fights without concrete done conditions", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    expect(() =>
      parseGeneratedAdventure({
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
      parseGeneratedAdventure({
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


  it("requires valid Main and Side Quest Steps and rejects Boss Fight steps", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    expect(() =>
      parseGeneratedAdventure({
        ...payload,
        acts: [{ ...payload.acts[0], mainQuests: [{ ...payload.acts[0].mainQuests[0], steps: [{ key: "only-step", description: "Do one concrete thing." }] }] }],
      }),
    ).toThrow("between 2 and 7");

    expect(() =>
      parseGeneratedAdventure({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            sideQuests: [
              {
                ...payload.acts[0].sideQuests[0],
                steps: [{ key: "same", description: "Do one concrete thing." }, { key: "same", description: "Do another concrete thing." }],
              },
            ],
          },
        ],
      }),
    ).toThrow("duplicate key");

    expect(() =>
      parseGeneratedAdventure({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            bossFights: [
              {
                ...payload.acts[0].bossFights[0],
                steps: [{ key: "prepare", description: "Prepare proof." }, { key: "complete", description: "Complete proof." }],
              },
            ],
          },
        ],
      }),
    ).toThrow("must not include Quest Steps");
  });

  it("rejects reward references to undeclared Skills", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    expect(() =>
      parseGeneratedAdventure({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            mainQuests: [
              {
                ...payload.acts[0].mainQuests[0],
                skillRewards: [{ skillKey: "unknown-skill", xp: 10 }],
              },
            ],
          },
        ],
      }),
    ).toThrow("unknown skill");
  });

  it("rejects inventory references to undeclared Inventory Items", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    expect(() =>
      parseGeneratedAdventure({
        ...payload,
        acts: [
          {
            ...payload.acts[0],
            sideQuests: [
              {
                ...payload.acts[0].sideQuests[0],
                inventoryItemKeys: ["missing-item"],
              },
            ],
          },
        ],
      }),
    ).toThrow("unknown inventory item");
  });

  it("accepts empty inventory references when no practical item is relevant", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    const adventure = parseGeneratedAdventure({
      ...payload,
      acts: [
        {
          ...payload.acts[0],
          sideQuests: [{ ...payload.acts[0].sideQuests[0], inventoryItemKeys: [] }],
        },
      ],
    });

    expect(adventure.acts[0].sideQuests[0].inventoryItemKeys).toEqual([]);
  });

  it("rejects missing, zero, negative, or non-integer XP rewards", () => {
    const payload = buildGeneratedAdventureBoundaryPayload();

    for (const xp of [undefined, 0, -1, 1.5]) {
      expect(() =>
        parseGeneratedAdventure({
          ...payload,
          acts: [
            {
              ...payload.acts[0],
              bossFights: [
                {
                  ...payload.acts[0].bossFights[0],
                  skillRewards: [{ skillKey: "meal-planning", xp }],
                },
              ],
            },
          ],
        }),
      ).toThrow("positive integer");
    }
  });

  it("rejects duplicate stable keys before generated content reaches persistence", () => {
    expect(() =>
      parseGeneratedAdventure({
        ...buildGeneratedAdventureBoundaryPayload(),
        skills: [
          {
            key: "meal-planning",
            name: "Meal Planning",
            description: "Choose realistic dinners.",
          },
          {
            key: "meal-planning",
            name: "Meal Planning Again",
            description: "Duplicate keys are unsafe for relationship mapping.",
          },
        ],
      }),
    ).toThrow("duplicate key");
  });
});
