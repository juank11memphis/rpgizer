import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

import {
  createAdventurePlannerComposition,
  type AdventurePlannerDb,
} from "../../adventure-planner/infra/adventure-planner-composition";
import {
  AdventurePlannerAdventureDetailContentReader,
  DrizzleOwnedAdventureLookup,
} from "./adventure-detail-content-reader";
import { getAdventureDetailMenu } from "../application/get-adventure-detail-menu/usecase";
import type { AdventureDetailContentReader } from "../application/get-adventure-detail-menu/ports";

export type AdventureExperiencePresenterCompositionDependencies = {
  db?: AdventurePlannerDb;
  contentReader?: AdventureDetailContentReader;
};

let db: AdventurePlannerDb | null = null;

export function createAdventureExperiencePresenterComposition(
  dependencies: AdventureExperiencePresenterCompositionDependencies = {},
) {
  const contentReader = dependencies.contentReader ?? createDefaultContentReader(dependencies.db);

  return {
    getAdventureDetailMenu: (input: Parameters<typeof getAdventureDetailMenu>[0]) =>
      getAdventureDetailMenu(input, { contentReader }),
  };
}

export type AdventureExperiencePresenterComposition = ReturnType<
  typeof createAdventureExperiencePresenterComposition
>;

function createDefaultContentReader(dbDependency?: AdventurePlannerDb): AdventureDetailContentReader {
  const defaultDb = dbDependency ?? getAdventureExperiencePresenterDb();
  const adventurePlanner = createAdventurePlannerComposition({ db: defaultDb });
  const ownedAdventureLookup = new DrizzleOwnedAdventureLookup(defaultDb);

  return new AdventurePlannerAdventureDetailContentReader({
    findExistingGeneratedAdventure: adventurePlanner.findExistingGeneratedAdventure,
    findOwnedAdventure: ownedAdventureLookup.findOwnedAdventure.bind(ownedAdventureLookup),
  });
}

function getAdventureExperiencePresenterDb(): AdventurePlannerDb {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Adventure Experience Presenter persistence.");
  }

  db ??= drizzle(postgres(databaseUrl), { schema });

  return db;
}
