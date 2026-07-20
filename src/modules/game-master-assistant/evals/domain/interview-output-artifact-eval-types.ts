import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";

export const INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS = [
  "goalSummary",
  "coreWhy",
  "successDefinition",
  "currentStage",
  "compactSourceSummary",
] as const satisfies readonly (keyof InterviewOutputArtifact)[];

export const INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS = [
  "blockers",
  "constraints",
  "existingResources",
  "likelyMissingResources",
  "safetyBoundaries",
  "preferences",
] as const satisfies readonly (keyof InterviewOutputArtifact)[];

export type InterviewOutputArtifactRequiredTextField =
  (typeof INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS)[number];

export type InterviewOutputArtifactRequiredTextArrayField =
  (typeof INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS)[number];

export type InterviewOutputArtifactEvalTranscriptMessage = {
  role: "user" | "game_master";
  content: string;
};

export type InterviewOutputArtifactEvalContext = {
  goalText: string;
  readinessStatus: "not_ready" | "ready_to_generate";
  interviewStatus: "interviewing" | "confirmed";
};

export type InterviewOutputArtifactFieldExpectation = {
  includes: string[];
};

export type InterviewOutputArtifactEvalExpectations = {
  goalSummary: InterviewOutputArtifactFieldExpectation;
  coreWhy: InterviewOutputArtifactFieldExpectation;
  successDefinition: InterviewOutputArtifactFieldExpectation;
  currentStage: InterviewOutputArtifactFieldExpectation;
  blockers: InterviewOutputArtifactFieldExpectation;
  constraints: InterviewOutputArtifactFieldExpectation;
  existingResources: InterviewOutputArtifactFieldExpectation;
  likelyMissingResources: InterviewOutputArtifactFieldExpectation;
  safetyBoundaries: InterviewOutputArtifactFieldExpectation;
  preferences: InterviewOutputArtifactFieldExpectation;
  compactSourceSummary: InterviewOutputArtifactFieldExpectation;
};

export type InterviewOutputArtifactEvalFixture = {
  id: string;
  name: string;
  context: InterviewOutputArtifactEvalContext;
  transcript: InterviewOutputArtifactEvalTranscriptMessage[];
  expectations: InterviewOutputArtifactEvalExpectations;
};

export type InterviewOutputArtifactEvalAssertion = {
  id: string;
  label: string;
  status: "passed" | "failed";
  message?: string;
};

export type InterviewOutputArtifactEvalDiagnostic = {
  fixtureId: string;
  assertionId: string;
  message: string;
};
