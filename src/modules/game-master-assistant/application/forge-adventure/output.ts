export const FORGE_ADVENTURE_NOT_CONFIRMED_MESSAGE =
  "Confirm the Interview before forging the Adventure foundation.";

export const FORGE_ADVENTURE_FAILURE_MESSAGE =
  "Your interview is safe. Try again when you’re ready.";

export type ForgeAdventureOutput =
  | {
      status: "ready";
      adventureId: string;
      artifactId: string;
      generatedAdventureId: string;
      reusedExistingArtifact: boolean;
      reusedExistingAdventure: boolean;
    }
  | { status: "not_found" }
  | { status: "not_confirmed"; message: string }
  | { status: "recoverable_failure"; message: string };
