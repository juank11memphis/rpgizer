export const INTERVIEW_OUTPUT_ARTIFACT_FAILURE_MESSAGE =
  "Your interview is safe. Try again when you’re ready.";

export const INTERVIEW_NOT_CONFIRMED_MESSAGE =
  "Confirm the Interview before forging the Adventure foundation.";

export type GenerateInterviewOutputArtifactReady = {
  status: "ready";
  adventureId: string;
  artifactId: string;
  reusedExistingArtifact: boolean;
};

export type GenerateInterviewOutputArtifactNotFound = {
  status: "not_found";
};

export type GenerateInterviewOutputArtifactNotConfirmed = {
  status: "not_confirmed";
  message: string;
};

export type GenerateInterviewOutputArtifactRecoverableFailure = {
  status: "recoverable_failure";
  message: string;
};

export type GenerateInterviewOutputArtifactOutput =
  | GenerateInterviewOutputArtifactReady
  | GenerateInterviewOutputArtifactNotFound
  | GenerateInterviewOutputArtifactNotConfirmed
  | GenerateInterviewOutputArtifactRecoverableFailure;
