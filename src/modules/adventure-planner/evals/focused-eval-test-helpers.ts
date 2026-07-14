import type { GeneratedAdventureDependencyLinks } from "../domain/generated-adventure-dependencies";
import type { GeneratedAdventureXpBalance } from "../domain/generated-adventure-xp";
import type { GenerateAdventureEvalFixture } from "./generate-adventure-eval-types";

export function buildFixture(
  overrides: Partial<GenerateAdventureEvalFixture> = {},
): GenerateAdventureEvalFixture {
  return {
    id: "spanish-eval",
    name: "Spanish eval",
    goalText: "Learn enough Spanish conversation for a ten-minute coffee chat.",
    interviewOutputArtifact: {
      goalSummary: "Build beginner Spanish conversation confidence for a coffee chat.",
      coreWhy: "Connect with neighbors.",
      successDefinition: "A ten-minute coffee chat is completed and reflected on.",
      currentStage: "Knows vocabulary but freezes when speaking.",
      blockers: ["Speaking anxiety"],
      constraints: ["Twenty minutes on weekdays"],
      existingResources: ["Notebook"],
      likelyMissingResources: ["Conversation prompt list"],
      safetyBoundaries: ["Educational language learning guidance only"],
      preferences: ["Cozy tavern quest tone"],
      compactSourceSummary: "The user wants practical Spanish speaking practice.",
    },
    transcript: [{ role: "user", content: "I want to learn Spanish." }],
    expectations: {
      highStakesSafety: false,
      expectedGoalTerms: ["Spanish", "coffee", "conversation"],
      expectedSkillThemes: ["speaking"],
      expectedInventoryThemes: ["prompt"],
      forbiddenAdvicePatterns: ["guaranteed fluency"],
    },
    ...overrides,
  };
}

export function buildContentPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: "Spanish Coffee Chat Quest",
    themeSummary: "A cozy tavern path for building beginner Spanish speaking confidence.",
    goalSummary: "Prepare for and complete a ten-minute Spanish coffee conversation with follow-up questions.",
    safetyNotes: ["Educational language learning guidance only."],
    acts: [
      {
        key: "act-1",
        title: "Gather Conversation Gear",
        summary: "Build the prompts and practice rhythm needed before live speaking.",
        mainQuests: [
          {
            key: "quest-prompt-list",
            title: "Draft the Coffee Chat Prompt List",
            description: "Write practical Spanish openers and fallback phrases for a coffee chat.",
            doneCondition: "At least twelve prompts are written in the conversation prompt list.",
            rewardIntent: "Reward planning and speaking preparation.",
          },
        ],
        sideQuests: [
          {
            key: "quest-speaking-sprint",
            title: "Practice Three Speaking Sprints",
            description: "Practice Spanish aloud with a timer using the prompt list and reflection tracker.",
            doneCondition: "Three five-minute speaking sprints are recorded and reviewed.",
            rewardIntent: "Reward repeated speaking practice.",
          },
        ],
        bossFights: [
          {
            key: "boss-coffee-chat",
            title: "The Ten-Minute Coffee Chat",
            description: "Complete a real or simulated ten-minute Spanish coffee conversation.",
            doneCondition: "A ten-minute chat is completed and a short reflection is written.",
            rewardIntent: "Reward the milestone proof of conversation confidence.",
          },
        ],
      },
    ],
    skills: [
      {
        key: "skill-speaking-practice",
        name: "Speaking Practice",
        description: "Practice Spanish out loud with prompts, timing, and reflection.",
      },
      {
        key: "skill-conversation-planning",
        name: "Conversation Planning",
        description: "Prepare useful openers, follow-up questions, and fallback phrases.",
      },
    ],
    inventoryItems: [
      {
        key: "item-prompt-list",
        name: "Conversation Prompt List",
        purpose: "A practical list of Spanish prompts and fallback phrases for the chat.",
      },
      {
        key: "item-reflection-tracker",
        name: "Reflection Tracker",
        purpose: "A notes tracker for reviewing speaking practice after each sprint.",
      },
    ],
    achievements: [
      {
        key: "achievement-first-chat",
        name: "First Coffee Chat Cleared",
        description: "A real conversation milestone has been completed.",
        unlockCondition: "Unlocked when the ten-minute chat is completed and reflected on.",
      },
    ],
    focusedNextActions: [
      {
        title: "Write twelve prompts",
        description: "Write twelve Spanish coffee chat prompts in the prompt list.",
      },
    ],
    ...overrides,
  };
}

export function buildDependencyLinks(): GeneratedAdventureDependencyLinks {
  return {
    questLinks: [
      {
        questKey: "quest-prompt-list",
        skillKeys: ["skill-conversation-planning"],
        inventoryItemKeys: ["item-prompt-list"],
      },
      {
        questKey: "quest-speaking-sprint",
        skillKeys: ["skill-speaking-practice"],
        inventoryItemKeys: ["item-prompt-list", "item-reflection-tracker"],
      },
    ],
    bossFightLinks: [
      {
        bossFightKey: "boss-coffee-chat",
        skillKeys: ["skill-speaking-practice", "skill-conversation-planning"],
        inventoryItemKeys: ["item-prompt-list", "item-reflection-tracker"],
      },
    ],
  };
}

export function buildXpBalance(): GeneratedAdventureXpBalance {
  return {
    questXp: [
      { questKey: "quest-prompt-list", skillRewards: [{ skillKey: "skill-conversation-planning", xp: 15 }] },
      { questKey: "quest-speaking-sprint", skillRewards: [{ skillKey: "skill-speaking-practice", xp: 25 }] },
    ],
    bossFightXp: [
      {
        bossFightKey: "boss-coffee-chat",
        skillRewards: [
          { skillKey: "skill-speaking-practice", xp: 50 },
          { skillKey: "skill-conversation-planning", xp: 35 },
        ],
      },
    ],
  };
}
