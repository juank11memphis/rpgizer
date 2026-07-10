export type GeneratedAdventureBoundaryPayload = {
  title: string;
  themeSummary: string;
  goalSummary: string;
  safetyNotes: string[];
  skills: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  inventoryItems: Array<{
    key: string;
    name: string;
    purpose: string;
  }>;
  achievements: Array<{
    key: string;
    name: string;
    description: string;
    unlockCondition: string;
  }>;
  focusedNextActions: Array<{
    title: string;
    description: string;
  }>;
  acts: Array<{
    key: string;
    title: string;
    summary: string;
    mainQuests: GeneratedAdventureBoundaryQuestPayload[];
    sideQuests: GeneratedAdventureBoundaryQuestPayload[];
    bossFights: GeneratedAdventureBoundaryBossFightPayload[];
  }>;
};

type GeneratedAdventureBoundaryQuestPayload = {
  key: string;
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  skillRewards: GeneratedAdventureBoundarySkillRewardPayload[];
  inventoryItemKeys: string[];
};

type GeneratedAdventureBoundaryBossFightPayload = GeneratedAdventureBoundaryQuestPayload;

type GeneratedAdventureBoundarySkillRewardPayload = {
  skillKey: string;
  xp: number;
};

export function buildGeneratedAdventureBoundaryPayload(
  overrides: Partial<GeneratedAdventureBoundaryPayload> = {},
): GeneratedAdventureBoundaryPayload {
  return {
    title: "The Hearthfire Cooking Quest",
    themeSummary: "A cozy guild journey toward reliable weeknight cooking.",
    goalSummary: "Become confident preparing three practical dinners without stress.",
    safetyNotes: ["Keep guidance educational and avoid medical nutrition advice."],
    skills: [
      {
        key: "meal-planning",
        name: "Meal Planning",
        description: "Choose recipes and shop with realistic weeknight constraints.",
      },
      {
        key: "knife-basics",
        name: "Knife Basics",
        description: "Prepare ingredients safely and efficiently.",
      },
    ],
    inventoryItems: [
      {
        key: "weekly-menu-template",
        name: "Weekly Menu Template",
        purpose: "A simple planning sheet for choosing dinners before shopping.",
      },
      {
        key: "sharp-chefs-knife",
        name: "Sharp Chef's Knife",
        purpose: "A practical tool that makes prep safer and faster.",
      },
    ],
    achievements: [
      {
        key: "three-dinner-streak",
        name: "Three Dinner Streak",
        description: "Recognizes completing three planned weeknight dinners.",
        unlockCondition: "Complete three main cooking quests in one week.",
      },
    ],
    focusedNextActions: [
      {
        title: "Pick the first dinner",
        description: "Choose one simple recipe and list the ingredients needed for it.",
      },
    ],
    acts: [
      {
        key: "act-setup",
        title: "Stock the Hearth",
        summary: "Prepare the first routines and tools for calm weeknight cooking.",
        mainQuests: [
          {
            key: "plan-first-menu",
            title: "Plan the First Menu",
            description: "Choose one realistic weeknight dinner and write the shopping list.",
            doneCondition: "A recipe is chosen and every needed ingredient is on a shopping list.",
            rewardIntent: "Build confidence by turning an unclear dinner goal into a concrete plan.",
            skillRewards: [{ skillKey: "meal-planning", xp: 25 }],
            inventoryItemKeys: ["weekly-menu-template"],
          },
        ],
        sideQuests: [
          {
            key: "prep-station-reset",
            title: "Reset the Prep Station",
            description: "Clear and organize the cooking space before the first dinner attempt.",
            doneCondition: "Counter space is clear and the needed tools are ready before cooking starts.",
            rewardIntent: "Reduce friction and make the main quest easier to start.",
            skillRewards: [{ skillKey: "knife-basics", xp: 10 }],
            inventoryItemKeys: ["sharp-chefs-knife"],
          },
        ],
        bossFights: [
          {
            key: "first-weeknight-service",
            title: "First Weeknight Service",
            description: "Cook the planned dinner on a real weeknight with normal time pressure.",
            doneCondition: "Dinner is cooked, served, and one improvement note is captured afterward.",
            rewardIntent: "Prove the plan works under realistic conditions.",
            skillRewards: [
              { skillKey: "meal-planning", xp: 40 },
              { skillKey: "knife-basics", xp: 20 },
            ],
            inventoryItemKeys: ["weekly-menu-template", "sharp-chefs-knife"],
          },
        ],
      },
    ],
    ...overrides,
  };
}
