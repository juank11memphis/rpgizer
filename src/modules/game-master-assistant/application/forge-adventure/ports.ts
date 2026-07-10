import type { GenerateAdventureInput } from "../../../adventure-planner/application/generate-adventure/input";
import type { GenerateAdventureOutput } from "../../../adventure-planner/application/generate-adventure/output";
import type {
  GenerateInterviewOutputArtifactRepository,
  InterviewOutputArtifactGenerator,
} from "../generate-interview-output-artifact/ports";

export type ForgeAdventureRepository = GenerateInterviewOutputArtifactRepository;

export type ForgeAdventurePlanner = {
  generateAdventure(input: GenerateAdventureInput): Promise<GenerateAdventureOutput>;
};

export type ForgeInterviewOutputArtifactGenerator = InterviewOutputArtifactGenerator;
