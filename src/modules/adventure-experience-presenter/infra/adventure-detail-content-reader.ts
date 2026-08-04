import { and, eq } from "drizzle-orm";

import { adventures } from "@/db/schema";

import type { ExistingGeneratedAdventureLookup, PersistedGeneratedAdventure } from "../../adventure-planner/application/generate-adventure/ports";
import type { AdventurePlannerDb } from "../../adventure-planner/infra/adventure-planner-composition";
import type { GetAdventureDetailMenuInput } from "../application/get-adventure-detail-menu/input";
import type {
  AdventureDetailContent,
  AdventureDetailContentReader,
  AdventureDetailContentReaderResult,
} from "../application/get-adventure-detail-menu/ports";

export type GeneratedAdventureLookup = (
  input: ExistingGeneratedAdventureLookup,
) => Promise<PersistedGeneratedAdventure | null>;

export type OwnedAdventureLookup = (input: GetAdventureDetailMenuInput) => Promise<boolean>;

export type AdventureDetailContentReaderDependencies = {
  findExistingGeneratedAdventure: GeneratedAdventureLookup;
  findOwnedAdventure?: OwnedAdventureLookup;
};

export class AdventurePlannerAdventureDetailContentReader implements AdventureDetailContentReader {
  constructor(private readonly dependencies: AdventureDetailContentReaderDependencies) {}

  async findGeneratedAdventureForDisplay(
    input: GetAdventureDetailMenuInput,
  ): Promise<AdventureDetailContentReaderResult> {
    const generatedAdventure = await this.dependencies.findExistingGeneratedAdventure(input);

    if (generatedAdventure) {
      return {
        status: "found",
        content: translateGeneratedAdventure(generatedAdventure),
      };
    }

    const isOwnedAdventure = await this.dependencies.findOwnedAdventure?.(input);
    if (isOwnedAdventure) {
      return { status: "not_ready" };
    }

    return { status: "not_found" };
  }
}

export class DrizzleOwnedAdventureLookup {
  constructor(private readonly db: AdventurePlannerDb) {}

  async findOwnedAdventure(input: GetAdventureDetailMenuInput): Promise<boolean> {
    const rows = await this.db
      .select({ id: adventures.id })
      .from(adventures)
      .where(and(eq(adventures.id, input.adventureId), eq(adventures.userId, input.userId)))
      .limit(1);

    return rows.length > 0;
  }
}

function translateGeneratedAdventure(persisted: PersistedGeneratedAdventure): AdventureDetailContent {
  const adventure = persisted.adventure;

  return {
    title: adventure.title,
    themeSummary: adventure.themeSummary || null,
    goalSummary: adventure.goalSummary,
    safetyNotes: [...adventure.safetyNotes],
    skills: adventure.skills.map((skill) => ({
      id: skill.key,
      name: skill.name,
      description: skill.description,
      xp: skill.xp,
      level: skill.level,
    })),
    inventoryItems: adventure.inventoryItems.map((item) => ({
      id: item.key,
      name: item.name,
      purpose: item.purpose,
      sequenceNumber: item.sequenceNumber,
    })),
    achievements: adventure.achievements.map((achievement) => ({
      id: achievement.key,
      name: achievement.name,
      description: achievement.description,
      unlockCondition: achievement.unlockCondition,
      sequenceNumber: achievement.sequenceNumber,
    })),
    acts: adventure.acts.map((act) => ({
      id: act.key,
      title: act.title,
      summary: act.summary,
      sequenceNumber: act.sequenceNumber,
      mainQuests: act.mainQuests.map((quest) => ({
        id: quest.key,
        title: quest.title,
        description: quest.description,
        doneCondition: quest.doneCondition,
        rewardIntent: quest.rewardIntent,
        sequenceNumber: quest.sequenceNumber,
        steps: quest.steps.map((step) => ({
          id: step.key,
          description: step.description,
          sequenceNumber: step.sequenceNumber,
        })),
        skillRewards: quest.skillRewards.map((reward) => ({
          skillId: reward.skillKey,
          xp: reward.xp,
        })),
        inventoryItemIds: [...quest.inventoryItemKeys],
      })),
      sideQuests: act.sideQuests.map((quest) => ({
        id: quest.key,
        title: quest.title,
        description: quest.description,
        doneCondition: quest.doneCondition,
        rewardIntent: quest.rewardIntent,
        sequenceNumber: quest.sequenceNumber,
        steps: quest.steps.map((step) => ({
          id: step.key,
          description: step.description,
          sequenceNumber: step.sequenceNumber,
        })),
        skillRewards: quest.skillRewards.map((reward) => ({
          skillId: reward.skillKey,
          xp: reward.xp,
        })),
        inventoryItemIds: [...quest.inventoryItemKeys],
      })),
      bossFights: act.bossFights.map((bossFight) => ({
        id: bossFight.key,
        title: bossFight.title,
        description: bossFight.description,
        doneCondition: bossFight.doneCondition,
        rewardIntent: bossFight.rewardIntent,
        sequenceNumber: bossFight.sequenceNumber,
        skillRewards: bossFight.skillRewards.map((reward) => ({
          skillId: reward.skillKey,
          xp: reward.xp,
        })),
        inventoryItemIds: [...bossFight.inventoryItemKeys],
      })),
    })),
  };
}
