import type {
  InterviewOutputArtifactGenerationRequest,
  InterviewOutputArtifactGenerator,
} from "../../../application/generate-interview-output-artifact/ports";
import type { InterviewOutputArtifactEvalFixture } from "../../domain/interview-output-artifact-eval-types";
import type {
  InterviewOutputArtifactEvalBlockedResult,
  InterviewOutputArtifactEvalErrorResult,
  InterviewOutputArtifactEvalFailedResult,
  InterviewOutputArtifactEvalPassedResult,
} from "./output";

export type InterviewOutputArtifactEvalRunnerEnvironment = NodeJS.ProcessEnv;

export type InterviewOutputArtifactEvalGenerator = Pick<
  InterviewOutputArtifactGenerator,
  "generateArtifact"
>;

export type InterviewOutputArtifactEvalFixtureLoader =
  () => Promise<InterviewOutputArtifactEvalFixture[]> | InterviewOutputArtifactEvalFixture[];

export type InterviewOutputArtifactEvalInstructionsLoader = () => Promise<string> | string;

export type InterviewOutputArtifactEvalGeneratorFactory = (input: {
  instructions: string;
  environment: InterviewOutputArtifactEvalRunnerEnvironment;
  model?: string;
}) => Promise<InterviewOutputArtifactEvalGenerator> | InterviewOutputArtifactEvalGenerator;

export type InterviewOutputArtifactEvalLogger = {
  started(fixtureIds: string[]): void;
  completed(result: InterviewOutputArtifactEvalPassedResult): void;
  failed(result: InterviewOutputArtifactEvalFailedResult): void;
  blocked(result: InterviewOutputArtifactEvalBlockedResult): void;
  error(result: InterviewOutputArtifactEvalErrorResult, error: unknown): void;
};

export type { InterviewOutputArtifactGenerationRequest };
