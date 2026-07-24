import type {
  ForgeProgressEventInput,
  ForgeProgressSnapshot,
  ForgeProgressStage,
  ForgeProgressStatus,
  ForgeRoadStageView,
  ForgeStageUiState,
} from "./forge-progress-types";

export const FORGE_ROAD_STAGES: readonly ForgeProgressStage[] = [
  "quest_lore",
  "adventure_roadmap",
  "connections",
  "xp_rewards",
  "opening_adventure",
] as const;

export const FORGE_STAGE_LABELS: Readonly<Record<ForgeProgressStage, string>> = {
  quest_lore: "Gathering your quest lore",
  adventure_roadmap: "Building your adventure roadmap",
  connections: "Connecting quests, skills, and inventory",
  xp_rewards: "Balancing XP and rewards",
  opening_adventure: "Opening your adventure",
};

const FORGE_STAGE_SHORT_LABELS: Readonly<Record<ForgeProgressStage, string>> = {
  quest_lore: "Quest lore",
  adventure_roadmap: "Roadmap",
  connections: "Connections",
  xp_rewards: "XP and rewards",
  opening_adventure: "Opening adventure",
};

const FORGE_STAGE_STATION_LABELS: Readonly<Record<ForgeProgressStage, string>> = {
  quest_lore: "Journal",
  adventure_roadmap: "Map",
  connections: "Pack",
  xp_rewards: "Rewards",
  opening_adventure: "Gate",
};

export function createInitialForgeProgressSnapshot(): ForgeProgressSnapshot {
  return {
    currentStage: "quest_lore",
    completedStages: new Set<ForgeProgressStage>(),
  };
}

export function applyForgeProgressEvent(
  snapshot: ForgeProgressSnapshot,
  payload: unknown,
): ForgeProgressSnapshot {
  const event = parseForgeProgressEvent(payload);

  if (!event) {
    return snapshot;
  }

  if (event.status === "started") {
    return startStage(snapshot, event.stage);
  }

  return completeStage(snapshot, event.stage);
}

export function buildForgeRoadStageViews(
  snapshot: ForgeProgressSnapshot,
): readonly ForgeRoadStageView[] {
  const currentStageIndex = getStageIndex(snapshot.currentStage);

  return FORGE_ROAD_STAGES.map((stage, stageIndex) => ({
    key: stage,
    label: FORGE_STAGE_LABELS[stage],
    shortLabel: FORGE_STAGE_SHORT_LABELS[stage],
    stationLabel: FORGE_STAGE_STATION_LABELS[stage],
    state: getStageUiState(snapshot, stage, stageIndex, currentStageIndex),
  }));
}

export function parseForgeProgressEvent(payload: unknown): ForgeProgressEventInput | null {
  if (!isRecord(payload)) {
    return null;
  }

  const stage = payload.stage;
  const status = payload.status;

  if (!isForgeProgressStage(stage) || !isForgeProgressStatus(status)) {
    return null;
  }

  return { stage, status };
}

export function isForgeProgressStage(value: unknown): value is ForgeProgressStage {
  return typeof value === "string" && FORGE_ROAD_STAGES.includes(value as ForgeProgressStage);
}

function isForgeProgressStatus(value: unknown): value is ForgeProgressStatus {
  return value === "started" || value === "completed";
}

function startStage(
  snapshot: ForgeProgressSnapshot,
  stage: ForgeProgressStage,
): ForgeProgressSnapshot {
  const nextCompletedStages = new Set(snapshot.completedStages);
  const startedStageIndex = getStageIndex(stage);

  for (const roadStage of FORGE_ROAD_STAGES.slice(0, startedStageIndex)) {
    nextCompletedStages.add(roadStage);
  }

  return {
    currentStage: stage,
    completedStages: nextCompletedStages,
  };
}

function completeStage(
  snapshot: ForgeProgressSnapshot,
  stage: ForgeProgressStage,
): ForgeProgressSnapshot {
  const nextCompletedStages = new Set(snapshot.completedStages);
  nextCompletedStages.add(stage);

  const completedStageIndex = getStageIndex(stage);
  const currentStageIndex = getStageIndex(snapshot.currentStage);
  const nextStage = FORGE_ROAD_STAGES[completedStageIndex + 1];

  return {
    currentStage:
      completedStageIndex >= currentStageIndex && nextStage ? nextStage : snapshot.currentStage,
    completedStages: nextCompletedStages,
  };
}

function getStageUiState(
  snapshot: ForgeProgressSnapshot,
  stage: ForgeProgressStage,
  stageIndex: number,
  currentStageIndex: number,
): ForgeStageUiState {
  if (snapshot.completedStages.has(stage)) {
    return "completed";
  }

  if (stageIndex === currentStageIndex) {
    return "current";
  }

  return "future";
}

function getStageIndex(stage: ForgeProgressStage): number {
  return FORGE_ROAD_STAGES.indexOf(stage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
