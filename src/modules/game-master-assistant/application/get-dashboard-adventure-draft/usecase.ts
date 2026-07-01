import type { GetDashboardAdventureDraftInput } from "./input";
import type { GetDashboardAdventureDraftOutput } from "./output";
import type { DashboardAdventureDraftRepository } from "./ports";

export type GetDashboardAdventureDraftDependencies = {
  adventureDraftRepository: DashboardAdventureDraftRepository;
};

export async function getDashboardAdventureDraft(
  input: GetDashboardAdventureDraftInput,
  dependencies: GetDashboardAdventureDraftDependencies,
): Promise<GetDashboardAdventureDraftOutput> {
  const draft = await dependencies.adventureDraftRepository.findActiveDraftForUser(
    input.userId,
  );

  return { draft };
}
