import type { AdventureDraftState } from "../../domain/adventure-draft-state";
import type { InterviewReadinessStatus } from "../../domain/interview-readiness";
import type { InterviewStatus } from "../../domain/interview-status";

export type DashboardAdventureDraft = {
  id: string;
  goalText: string;
  state: AdventureDraftState;
  readinessStatus: InterviewReadinessStatus;
  interviewStatus: InterviewStatus;
  updatedAt: Date;
};

export type GetDashboardAdventureDraftOutput = {
  draft: DashboardAdventureDraft | null;
};
