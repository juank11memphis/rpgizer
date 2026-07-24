import type {
  AdventureContentGenerator,
  AdventureDependencyLinker,
  AdventureXpBalancer,
  GeneratedAdventureRepository,
} from "../../../adventure-planner/application/generate-adventure/ports";
import type {
  GenerateInterviewOutputArtifactRepository,
  InterviewOutputArtifactGenerator,
} from "../generate-interview-output-artifact/ports";

export type ForgeAdventureRepository = GenerateInterviewOutputArtifactRepository;

export type {
  ForgeProgressEvent,
  ForgeProgressReporter,
  ForgeProgressStage,
  ForgeProgressStatus,
} from "./progress";

export type ForgeAdventurePlanner = GeneratedAdventureRepository &
  AdventureContentGenerator &
  AdventureDependencyLinker &
  AdventureXpBalancer;

export type ForgeInterviewOutputArtifactGenerator = InterviewOutputArtifactGenerator;
