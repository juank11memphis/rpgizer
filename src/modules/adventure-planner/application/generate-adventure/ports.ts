import type { ValidatedGeneratedAdventureContent } from "./output";

export type ExistingGeneratedAdventureLookup = {
  userId: string;
  adventureId: string;
};

export type SaveGeneratedAdventureInput = ExistingGeneratedAdventureLookup & {
  interviewOutputArtifactId: string;
  adventure: ValidatedGeneratedAdventureContent;
};

export type PersistedGeneratedAdventure = {
  adventureId: string;
  generatedAdventureId: string;
  adventure: ValidatedGeneratedAdventureContent;
};

export type SaveGeneratedAdventureResult = PersistedGeneratedAdventure & {
  reusedExistingAdventure: boolean;
};

export type GeneratedAdventureRepository = {
  findExistingGeneratedAdventure(
    input: ExistingGeneratedAdventureLookup,
  ): Promise<PersistedGeneratedAdventure | null>;
  saveGeneratedAdventure(input: SaveGeneratedAdventureInput): Promise<SaveGeneratedAdventureResult>;
};
