import type { ForgeProgressReporter } from "./progress";

export type ForgeAdventureInput = {
  userId: string;
  adventureId: string;
  progressReporter?: ForgeProgressReporter;
};
