import { ForgeProgressScreen } from "./forge-progress-screen";
import {
  buildForgeRoadStageViews,
  createInitialForgeProgressSnapshot,
} from "./forge-progress-model";

export default function Loading() {
  return (
    <ForgeProgressScreen
      adventureId="loading"
      stages={buildForgeRoadStageViews(createInitialForgeProgressSnapshot())}
      connectionState="progress"
    />
  );
}
