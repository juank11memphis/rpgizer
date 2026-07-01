import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";

export type DashboardAdventureDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  updatedAt: Date;
};

export type GetDashboardAdventureDraftOutput = {
  draft: DashboardAdventureDraft | null;
};
