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
  | "quest quality"
  | "side quest quality"
  | "boss fight quality"
  | "inventory quality"
  | "skill quality"
  | "achievement quality"
  | "next action quality"
  | "references"
  | "progression balance"
  | "fixture grounding"
  | "safety"
  | "configuration"
  | "content generation"
  | "dependency linking"
  | "xp balancing"
  | "final assembly"
  | "final validation"
  | "generation";

export type AdventureQualityAssertionStatus = "passed" | "failed";

export type AdventureQualityAssertionOutcome = {
  id: string;
  label: string;
  status: AdventureQualityAssertionStatus;
  message?: string;
};

export type AdventureQualityCheckResult = {
  fixtureId: string;
  diagnostics: AdventureQualityDiagnostic[];
  assertions: AdventureQualityAssertionOutcome[];
};

export function buildAdventureQualityAssertionOutcomes(
  checkedAreas: readonly AdventureQualityDiagnosticArea[],
  diagnostics: readonly AdventureQualityDiagnostic[],
): AdventureQualityAssertionOutcome[] {
  const outcomes: AdventureQualityAssertionOutcome[] = [];

  for (const area of checkedAreas) {
    const areaDiagnostics = diagnostics.filter((diagnostic) => diagnostic.area === area);
    if (areaDiagnostics.length === 0) {
      outcomes.push({
        id: buildAdventureQualityAssertionId(area),
        label: formatAdventureQualityAssertionLabel(area),
        status: "passed",
      });
      continue;
    }

    outcomes.push(
      ...areaDiagnostics.map((diagnostic, index) => ({
        id: areaDiagnostics.length === 1
          ? buildAdventureQualityAssertionId(area)
          : `${buildAdventureQualityAssertionId(area)}-${index + 1}`,
        label: formatAdventureQualityAssertionLabel(area),
        status: "failed" as const,
        message: diagnostic.message,
      })),
    );
  }

  return outcomes;
}

export function buildAdventureQualityAssertionId(area: AdventureQualityDiagnosticArea): string {
  return `adventure-${area.replace(/\s+/gu, "-")}`;
}

export function formatAdventureQualityAssertionLabel(area: AdventureQualityDiagnosticArea): string {
  return area
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toLocaleUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
