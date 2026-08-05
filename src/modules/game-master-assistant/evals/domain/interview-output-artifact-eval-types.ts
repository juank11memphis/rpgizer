import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";

export const INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS = [
  "goalSummary",
  "goalType",
  "coreWhy",
  "successDefinition",
  "currentStage",
  "currentSkillOrBaseline",
  "firstMilestoneReadiness",
  "compactSourceSummary",
] as const satisfies readonly (keyof InterviewOutputArtifact)[];

export const INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS = [
  "motivationDetails",
  "blockers",
  "constraints",
  "existingResources",
  "likelyMissingResources",
  "missingResources",
  "safetyBoundaries",
  "preferences",
  "dislikesOrAvoidances",
  "priorAttempts",
  "confidenceGaps",
  "examplesOrInspirations",
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
  includes?: string[];
  includesAny?: string[][];
};

export type InterviewOutputArtifactEvalExpectations = {
  goalSummary: InterviewOutputArtifactFieldExpectation;
  goalType: InterviewOutputArtifactFieldExpectation;
  coreWhy: InterviewOutputArtifactFieldExpectation;
  motivationDetails: InterviewOutputArtifactFieldExpectation;
  successDefinition: InterviewOutputArtifactFieldExpectation;
  currentStage: InterviewOutputArtifactFieldExpectation;
  currentSkillOrBaseline: InterviewOutputArtifactFieldExpectation;
  blockers: InterviewOutputArtifactFieldExpectation;
  constraints: InterviewOutputArtifactFieldExpectation;
  existingResources: InterviewOutputArtifactFieldExpectation;
  likelyMissingResources: InterviewOutputArtifactFieldExpectation;
  missingResources: InterviewOutputArtifactFieldExpectation;
  safetyBoundaries: InterviewOutputArtifactFieldExpectation;
  preferences: InterviewOutputArtifactFieldExpectation;
  dislikesOrAvoidances: InterviewOutputArtifactFieldExpectation;
  priorAttempts: InterviewOutputArtifactFieldExpectation;
  confidenceGaps: InterviewOutputArtifactFieldExpectation;
  examplesOrInspirations: InterviewOutputArtifactFieldExpectation;
  firstMilestoneReadiness: InterviewOutputArtifactFieldExpectation;
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
