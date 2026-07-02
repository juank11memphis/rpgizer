import type {
  GetCurrentInterviewOutputArtifactInput,
  SaveCurrentInterviewOutputArtifactInput,
} from "./input";
import type { CurrentInterviewOutputArtifact } from "./output";

export type InterviewOutputArtifactRepository = {
  getCurrentArtifact(
    input: GetCurrentInterviewOutputArtifactInput,
  ): Promise<CurrentInterviewOutputArtifact | null>;
  saveCurrentArtifact(
    input: SaveCurrentInterviewOutputArtifactInput,
  ): Promise<CurrentInterviewOutputArtifact>;
};
