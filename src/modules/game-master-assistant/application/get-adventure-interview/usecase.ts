import type { GetAdventureInterviewInput } from "./input";
import type { GetAdventureInterviewOutput } from "./output";
import type { AdventureInterviewRepository } from "./ports";

export type GetAdventureInterviewDependencies = {
  adventureDraftRepository: AdventureInterviewRepository;
};

export async function getAdventureInterview(
  input: GetAdventureInterviewInput,
  dependencies: GetAdventureInterviewDependencies,
): Promise<GetAdventureInterviewOutput> {
  const interview = await dependencies.adventureDraftRepository.getDraftWithTranscript({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  return { interview };
}
