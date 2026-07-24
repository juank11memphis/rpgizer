import type {
  ForgeProgressStage,
  ForgeProgressStatus,
} from "@/modules/game-master-assistant/application/forge-adventure/progress";

export type { ForgeProgressStage, ForgeProgressStatus };

export type ForgeStageUiState = "completed" | "current" | "future";

export type ForgeRoadStageView = Readonly<{
  key: ForgeProgressStage;
  label: string;
  shortLabel: string;
  stationLabel: string;
  state: ForgeStageUiState;
}>;

export type ForgeConnectionViewState = "progress" | "reconnecting" | "paused";

export type ForgeProgressEventInput = Readonly<{
  stage: ForgeProgressStage;
  status: ForgeProgressStatus;
}>;

export type ForgeProgressSnapshot = Readonly<{
  currentStage: ForgeProgressStage;
  completedStages: ReadonlySet<ForgeProgressStage>;
}>;
