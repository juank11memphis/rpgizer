import type { GeneratedAdventure } from "../../domain/generated-adventure";

export type ValidatedGeneratedAdventureContent = GeneratedAdventure;

export type GenerateAdventureOutput =
  | {
      status: "ready";
      adventureId: string;
      generatedAdventureId: string;
      reusedExistingAdventure: boolean;
      adventure: ValidatedGeneratedAdventureContent;
    }
  | { status: "not_found" }
  | { status: "not_confirmed"; message: string }
  | { status: "recoverable_failure"; message: string };
