export type ForgeProgressStage =
  | "quest_lore"
  | "adventure_roadmap"
  | "connections"
  | "xp_rewards"
  | "opening_adventure";

export type ForgeProgressStatus = "started" | "completed";

export type ForgeProgressEvent = {
  stage: ForgeProgressStage;
  status: ForgeProgressStatus;
};

export type ForgeProgressReporter = {
  report(event: ForgeProgressEvent): void | Promise<void>;
};

export async function reportForgeProgress(
  reporter: ForgeProgressReporter | undefined,
  event: ForgeProgressEvent,
): Promise<void> {
  await reporter?.report(event);
}
