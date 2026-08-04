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

type GeneratedAdventureBoundaryQuestStepPayload = {
  key: string;
  description: string;
};

type GeneratedAdventureBoundaryQuestPayload = {
  key: string;
  title: string;
  description: string;
  doneCondition: string;
  rewardIntent: string;
  steps: GeneratedAdventureBoundaryQuestStepPayload[];
  skillRewards: GeneratedAdventureBoundarySkillRewardPayload[];
  inventoryItemKeys: string[];
};

type GeneratedAdventureBoundaryBossFightPayload = Omit<GeneratedAdventureBoundaryQuestPayload, "steps">;

type GeneratedAdventureBoundarySkillRewardPayload = {
  skillKey: string;
  xp: number;
};

export type GeneratedAdventureContentBoundaryPayload = Omit<GeneratedAdventureBoundaryPayload, "acts"> & {
  acts: Array<{
    key: string;
    title: string;
    summary: string;
    mainQuests: GeneratedAdventureContentBoundaryQuestPayload[];
    sideQuests: GeneratedAdventureContentBoundaryQuestPayload[];
    bossFights: GeneratedAdventureContentBoundaryBossFightPayload[];
  }>;
};

type GeneratedAdventureContentBoundaryQuestPayload = Omit<
  GeneratedAdventureBoundaryQuestPayload,
  "skillRewards" | "inventoryItemKeys"
>;

type GeneratedAdventureContentBoundaryBossFightPayload = Omit<GeneratedAdventureContentBoundaryQuestPayload, "steps">;

export type GeneratedAdventureDependencyLinksBoundaryPayload = {
  questLinks: Array<{
    questKey: string;
    skillKeys: string[];
    inventoryItemKeys: string[];
  }>;
  bossFightLinks: Array<{
    bossFightKey: string;
    skillKeys: string[];
    inventoryItemKeys: string[];
  }>;
};

export type GeneratedAdventureXpBalanceBoundaryPayload = {
  questXp: Array<{
    questKey: string;
    skillRewards: GeneratedAdventureBoundarySkillRewardPayload[];
  }>;
  bossFightXp: Array<{
    bossFightKey: string;
    skillRewards: GeneratedAdventureBoundarySkillRewardPayload[];
  }>;
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
            steps: [
              { key: "choose-recipe", description: "Pick one recipe that fits your weeknight time window." },
              { key: "write-shopping-list", description: "Write every ingredient and tool needed before shopping." },
              { key: "confirm-cooking-window", description: "Choose the evening and start time for cooking the meal." },
            ],
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
            steps: [
              { key: "clear-counter", description: "Clear enough counter space for safe chopping and staging." },
              { key: "stage-tools", description: "Place the knife, board, pan, and template within reach." },
            ],
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


export function buildGeneratedAdventureContentBoundaryPayload(
  overrides: Partial<GeneratedAdventureContentBoundaryPayload> = {},
): GeneratedAdventureContentBoundaryPayload {
  const finalPayload = buildGeneratedAdventureBoundaryPayload();

  return {
    ...finalPayload,
    acts: finalPayload.acts.map((act) => ({
      key: act.key,
      title: act.title,
      summary: act.summary,
      mainQuests: act.mainQuests.map(stripQuestLinks),
      sideQuests: act.sideQuests.map(stripQuestLinks),
      bossFights: act.bossFights.map(stripBossFightLinks),
    })),
    ...overrides,
  };
}

export function buildGeneratedAdventureDependencyLinksBoundaryPayload(
  overrides: Partial<GeneratedAdventureDependencyLinksBoundaryPayload> = {},
): GeneratedAdventureDependencyLinksBoundaryPayload {
  return {
    questLinks: [
      {
        questKey: "plan-first-menu",
        skillKeys: ["meal-planning"],
        inventoryItemKeys: ["weekly-menu-template"],
      },
      {
        questKey: "prep-station-reset",
        skillKeys: ["knife-basics"],
        inventoryItemKeys: ["sharp-chefs-knife"],
      },
    ],
    bossFightLinks: [
      {
        bossFightKey: "first-weeknight-service",
        skillKeys: ["meal-planning", "knife-basics"],
        inventoryItemKeys: ["weekly-menu-template", "sharp-chefs-knife"],
      },
    ],
    ...overrides,
  };
}

export function buildGeneratedAdventureXpBalanceBoundaryPayload(
  overrides: Partial<GeneratedAdventureXpBalanceBoundaryPayload> = {},
): GeneratedAdventureXpBalanceBoundaryPayload {
  return {
    questXp: [
      { questKey: "plan-first-menu", skillRewards: [{ skillKey: "meal-planning", xp: 25 }] },
      { questKey: "prep-station-reset", skillRewards: [{ skillKey: "knife-basics", xp: 10 }] },
    ],
    bossFightXp: [
      {
        bossFightKey: "first-weeknight-service",
        skillRewards: [
          { skillKey: "meal-planning", xp: 40 },
          { skillKey: "knife-basics", xp: 20 },
        ],
      },
    ],
    ...overrides,
  };
}

function stripQuestLinks(
  quest: GeneratedAdventureBoundaryQuestPayload,
): GeneratedAdventureContentBoundaryQuestPayload {
  return {
    key: quest.key,
    title: quest.title,
    description: quest.description,
    doneCondition: quest.doneCondition,
    rewardIntent: quest.rewardIntent,
    steps: quest.steps,
  };
}

function stripBossFightLinks(
  bossFight: GeneratedAdventureBoundaryBossFightPayload,
): GeneratedAdventureContentBoundaryBossFightPayload {
  return {
    key: bossFight.key,
    title: bossFight.title,
    description: bossFight.description,
    doneCondition: bossFight.doneCondition,
    rewardIntent: bossFight.rewardIntent,
  };
}
