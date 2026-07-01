import type { AdventureInterview } from "./output";

export type AdventureInterviewRepository = {
  getDraftWithTranscript(input: {
    userId: string;
    adventureId: string;
  }): Promise<AdventureInterview | null>;
};
