import type {
  InterviewOutputArtifactEvalFixtureLoader,
  InterviewOutputArtifactEvalGeneratorFactory,
  InterviewOutputArtifactEvalInstructionsLoader,
  InterviewOutputArtifactEvalLogger,
  InterviewOutputArtifactEvalRunnerEnvironment,
} from "./ports";

export type RunInterviewOutputArtifactEvalsInput = {
  environment: InterviewOutputArtifactEvalRunnerEnvironment;
  loadFixtures: InterviewOutputArtifactEvalFixtureLoader;
  loadInstructions: InterviewOutputArtifactEvalInstructionsLoader;
  createGenerator: InterviewOutputArtifactEvalGeneratorFactory;
  modelLabel?: string;
  testCaseId?: string;
  logger?: InterviewOutputArtifactEvalLogger;
};
