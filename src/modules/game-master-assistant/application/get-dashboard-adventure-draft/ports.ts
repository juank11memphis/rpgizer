import type { DashboardAdventureDraft } from "./output";

export type DashboardAdventureDraftRepository = {
  findActiveDraftForUser(userId: string): Promise<DashboardAdventureDraft | null>;
};
