import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../../db/schema";
import type {
  AdventureContentGenerator,
  AdventureDependencyLinker,
  AdventureXpBalancer,
  GeneratedAdventureRepository,
} from "../application/generate-adventure/ports";
import { DrizzleGeneratedAdventureRepository } from "./drizzle-generated-adventure-repository";
import { OpenAIAdventureContentGenerator } from "./openai-adventure-content-generator";
import { OpenAIAdventureDependencyLinker } from "./openai-adventure-dependency-linker";
import { OpenAIAdventureXpBalancer } from "./openai-adventure-xp-balancer";

export type AdventurePlannerDb = ReturnType<typeof drizzle<typeof schema>>;

export type AdventurePlannerCompositionDependencies = {
  db?: AdventurePlannerDb;
  generatedAdventureRepository?: GeneratedAdventureRepository;
  contentGenerator?: AdventureContentGenerator;
  dependencyLinker?: AdventureDependencyLinker;
  xpBalancer?: AdventureXpBalancer;
};

let db: AdventurePlannerDb | null = null;

export function createAdventurePlannerComposition(
  dependencies: AdventurePlannerCompositionDependencies = {},
) {
  const generatedAdventureRepository =
    dependencies.generatedAdventureRepository ??
    new DrizzleGeneratedAdventureRepository(dependencies.db ?? getAdventurePlannerDb());
  const contentGenerator = dependencies.contentGenerator ?? new OpenAIAdventureContentGenerator();
  const dependencyLinker = dependencies.dependencyLinker ?? new OpenAIAdventureDependencyLinker();
  const xpBalancer = dependencies.xpBalancer ?? new OpenAIAdventureXpBalancer();

  return {
    findExistingGeneratedAdventure: generatedAdventureRepository.findExistingGeneratedAdventure.bind(
      generatedAdventureRepository,
    ),
    saveGeneratedAdventure: generatedAdventureRepository.saveGeneratedAdventure.bind(
      generatedAdventureRepository,
    ),
    generateAdventureContent: contentGenerator.generateAdventureContent.bind(contentGenerator),
    linkAdventureDependencies: dependencyLinker.linkAdventureDependencies.bind(dependencyLinker),
    balanceAdventureXp: xpBalancer.balanceAdventureXp.bind(xpBalancer),
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
