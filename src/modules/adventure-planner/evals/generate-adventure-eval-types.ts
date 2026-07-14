import type { InterviewOutputArtifact } from "../../game-master-assistant/domain/interview-output-artifact";
import type { InterviewMessageRole } from "../../game-master-assistant/domain/interview-message";

export type GenerateAdventureEvalFixture = {
  id: string;
  name: string;
  goalText: string;
  interviewOutputArtifact: InterviewOutputArtifact;
  transcript: GenerateAdventureEvalTranscriptMessage[];
  expectations: GenerateAdventureEvalExpectations;
};

export type GenerateAdventureEvalTranscriptMessage = {
  role: InterviewMessageRole;
  content: string;
};

export type GenerateAdventureEvalExpectations = {
  highStakesSafety: boolean;
  expectedGoalTerms: string[];
  expectedSkillThemes: string[];
  expectedInventoryThemes: string[];
  forbiddenAdvicePatterns: string[];
};

export type AdventureQualityDiagnostic = {
  area: AdventureQualityDiagnosticArea;
  message: string;
};

export type AdventureQualityDiagnosticArea =
  | "required structure"
  | "done condition"
  | "side quest quality"
  | "boss fight quality"
  | "inventory quality"
  | "skill quality"
  | "achievement quality"
  | "next action quality"
  | "references"
  | "fixture grounding"
  | "safety"
  | "configuration"
  | "content generation"
  | "dependency linking"
  | "xp balancing"
  | "final assembly"
  | "final validation"
  | "generation";

export type AdventureQualityCheckResult = {
  fixtureId: string;
  diagnostics: AdventureQualityDiagnostic[];
};
