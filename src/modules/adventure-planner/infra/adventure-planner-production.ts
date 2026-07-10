import type { AdventureGenerator } from "../application/generate-adventure/ports";
import { OpenAIAdventureGenerator } from "./openai-adventure-generator";

export type AdventurePlannerProductionDependencies = {
  adventureGenerator?: AdventureGenerator;
};

export function createAdventurePlannerProduction(
  dependencies: AdventurePlannerProductionDependencies = {},
) {
  const resolveAdventureGenerator = () =>
    dependencies.adventureGenerator ?? new OpenAIAdventureGenerator();

  return {
    createAdventureGenerator(): AdventureGenerator {
      return resolveAdventureGenerator();
    },
  };
}

export type AdventurePlannerProduction = ReturnType<typeof createAdventurePlannerProduction>;
