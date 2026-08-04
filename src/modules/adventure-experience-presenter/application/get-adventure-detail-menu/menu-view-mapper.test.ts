import { describe, expect, it } from "vitest";

import { mapAdventureDetailMenuView } from "./menu-view-mapper";
import type { AdventureDetailContent } from "./ports";

const completeContent: AdventureDetailContent = {
  title: "The Hearthfire Cooking Quest",
  themeSummary: "A cozy guild journey toward reliable weeknight cooking.",
  goalSummary: "Become confident preparing three practical dinners without stress.",
  safetyNotes: ["Keep guidance educational and avoid medical nutrition advice."],
  skills: [
    {
      id: "skill-meal-planning",
      name: "Meal Planning",
      description: "Choose recipes and shop with realistic weeknight constraints.",
      xp: 0,
      level: 1,
    },
    {
      id: "skill-knife-basics",
      name: "Knife Basics",
      description: "Prepare ingredients safely and efficiently.",
      xp: 0,
      level: 1,
    },
  ],
  inventoryItems: [
    {
      id: "item-menu-template",
      name: "Weekly Menu Template",
      purpose: "A simple planning sheet for choosing dinners before shopping.",
      sequenceNumber: 1,
    },
    {
      id: "item-chefs-knife",
      name: "Sharp Chef's Knife",
      purpose: "A practical tool that makes prep safer and faster.",
      sequenceNumber: 2,
    },
  ],
  achievements: [
    {
      id: "achievement-three-dinners",
      name: "Three Dinner Streak",
      description: "Recognizes completing three planned weeknight dinners.",
      unlockCondition: "Complete three main cooking quests in one week.",
      sequenceNumber: 1,
    },
  ],
  acts: [
    {
      id: "act-stock-hearth",
      title: "Stock the Hearth",
      summary: "Prepare the first routines and tools for calm weeknight cooking.",
      sequenceNumber: 1,
      mainQuests: [
        {
          id: "quest-plan-menu",
          title: "Plan the First Menu",
          description: "Choose one realistic weeknight dinner and write the shopping list.",
          doneCondition: "A recipe is chosen and every needed ingredient is on a shopping list.",
          rewardIntent: "Build confidence by turning an unclear dinner goal into a concrete plan.",
          sequenceNumber: 1,
          skillRewards: [{ skillId: "skill-meal-planning", xp: 25 }],
          inventoryItemIds: ["item-menu-template"],
        },
      ],
      sideQuests: [
        {
          id: "quest-reset-station",
          title: "Reset the Prep Station",
          description: "Clear and organize the cooking space before the first dinner attempt.",
          doneCondition: "Counter space is clear and the needed tools are ready before cooking starts.",
          rewardIntent: "Reduce friction and make the main quest easier to start.",
          sequenceNumber: 1,
          skillRewards: [{ skillId: "skill-knife-basics", xp: 10 }],
          inventoryItemIds: ["item-chefs-knife"],
        },
      ],
      bossFights: [
        {
          id: "boss-first-service",
          title: "First Weeknight Service",
          description: "Cook the planned dinner on a real weeknight with normal time pressure.",
          doneCondition: "Dinner is cooked, served, and one improvement note is captured afterward.",
          rewardIntent: "Prove the plan works under realistic conditions.",
          sequenceNumber: 1,
          skillRewards: [
            { skillId: "skill-meal-planning", xp: 40 },
            { skillId: "skill-knife-basics", xp: 20 },
          ],
          inventoryItemIds: ["item-menu-template", "item-chefs-knife"],
        },
      ],
    },
  ],
};

describe("mapAdventureDetailMenuView", () => {
  it("builds a complete four-tab Adventure menu view with stable defaults", () => {
    const menu = mapAdventureDetailMenuView(completeContent);

    expect(menu.header).toEqual({
      title: "The Hearthfire Cooking Quest",
      themeSummary: "A cozy guild journey toward reliable weeknight cooking.",
      goalSummary: "Become confident preparing three practical dinners without stress.",
      safetyNotes: ["Keep guidance educational and avoid medical nutrition advice."],
    });
    expect(menu.tabs.map((tab) => tab.id)).toEqual([
      "journal",
      "inventory",
      "character",
      "achievements",
    ]);
    expect(menu.journal.defaultSelectedActId).toBe("act-stock-hearth");
    expect(menu.journal.defaultSelectedDetailId).toBe("quest-plan-menu");
    expect(menu.inventory.defaultSelectedItemId).toBe("item-menu-template");
    expect(menu.character.defaultSelectedSkillId).toBe("skill-meal-planning");
    expect(menu.achievements.defaultSelectedAchievementId).toBe("achievement-three-dinners");
  });

  it("groups Journal details by Act and resolves reward and inventory display names", () => {
    const menu = mapAdventureDetailMenuView(completeContent);
    const act = menu.journal.acts[0];

    expect(act?.mainQuests[0]).toMatchObject({
      type: "main_quest",
      typeLabel: "Main Quest",
      title: "Plan the First Menu",
      statusLabel: "Not started",
      skillRewards: [{ skillId: "skill-meal-planning", skillName: "Meal Planning", xp: 25, label: "+25 Meal Planning" }],
      linkedInventoryNames: ["Weekly Menu Template"],
    });
    expect(act?.sideQuests[0]?.typeLabel).toBe("Side Quest");
    expect(act?.bossFights[0]).toMatchObject({
      typeLabel: "Boss Fight",
      linkedInventoryNames: ["Weekly Menu Template", "Sharp Chef's Knife"],
    });
  });

  it("centralizes read-only display wording", () => {
    const menu = mapAdventureDetailMenuView(completeContent);

    expect(menu.inventory.items[0]?.statusLabel).toBe("Needed");
    expect(menu.achievements.achievements[0]?.statusLabel).toBe("Available");
    expect(menu.character.skills[0]).toMatchObject({ levelLabel: "Lv 1", xpLabel: "XP 0 / 100" });
  });

  it("uses side quests and boss fights as Journal detail fallbacks", () => {
    const menu = mapAdventureDetailMenuView({
      ...completeContent,
      acts: [
        {
          ...completeContent.acts[0]!,
          mainQuests: [],
        },
      ],
    });
    expect(menu.journal.defaultSelectedDetailId).toBe("quest-reset-station");

    const bossOnlyMenu = mapAdventureDetailMenuView({
      ...completeContent,
      acts: [
        {
          ...completeContent.acts[0]!,
          mainQuests: [],
          sideQuests: [],
        },
      ],
    });
    expect(bossOnlyMenu.journal.defaultSelectedDetailId).toBe("boss-first-service");
  });

  it("includes user-facing empty tab messages", () => {
    const menu = mapAdventureDetailMenuView({
      ...completeContent,
      acts: [],
      skills: [],
      inventoryItems: [],
      achievements: [],
    });

    expect(menu.journal).toMatchObject({
      emptyMessage: "No Journal entries yet.",
      defaultSelectedActId: null,
      defaultSelectedDetailId: null,
    });
    expect(menu.inventory).toMatchObject({
      emptyMessage: "No inventory items yet.",
      defaultSelectedItemId: null,
    });
    expect(menu.character).toMatchObject({ emptyMessage: "No skills yet.", defaultSelectedSkillId: null });
    expect(menu.achievements).toMatchObject({
      emptyMessage: "No achievements yet.",
      defaultSelectedAchievementId: null,
    });
  });
});
