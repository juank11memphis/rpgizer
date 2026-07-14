import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../../db/schema";
import { generateAdventure } from "../application/generate-adventure/usecase";
import type { GenerateAdventureInput } from "../application/generate-adventure/input";
import type {
  AdventureGenerator,
  GeneratedAdventureRepository,
} from "../application/generate-adventure/ports";
import { DrizzleGeneratedAdventureRepository } from "./drizzle-generated-adventure-repository";
import { OpenAIMultiStepAdventureGenerator } from "./openai-multi-step-adventure-generator";

export type AdventurePlannerDb = ReturnType<typeof drizzle<typeof schema>>;

export type AdventurePlannerCompositionDependencies = {
  db?: AdventurePlannerDb;
  generatedAdventureRepository?: GeneratedAdventureRepository;
  adventureGenerator?: AdventureGenerator;
};

let db: AdventurePlannerDb | null = null;

export function createAdventurePlannerComposition(
  dependencies: AdventurePlannerCompositionDependencies = {},
) {
  const resolveGeneratedAdventureRepository = () =>
    dependencies.generatedAdventureRepository ??
    new DrizzleGeneratedAdventureRepository(dependencies.db ?? getAdventurePlannerDb());
  const resolveAdventureGenerator = () =>
    dependencies.adventureGenerator ?? new OpenAIMultiStepAdventureGenerator();

  return {
    createAdventureGenerator(): AdventureGenerator {
      return resolveAdventureGenerator();
    },
    generateAdventure(input: GenerateAdventureInput) {
      return generateAdventure(input, {
        generatedAdventureRepository: resolveGeneratedAdventureRepository(),
        adventureGenerator: resolveAdventureGenerator(),
      });
    },
  };
}

export type AdventurePlannerComposition = ReturnType<typeof createAdventurePlannerComposition>;

function getAdventurePlannerDb(): AdventurePlannerDb {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Adventure Planner persistence.");
  }

  db ??= drizzle(postgres(databaseUrl), { schema });

  return db;
}
