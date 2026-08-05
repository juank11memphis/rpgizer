export type InterviewOutputArtifact = {
  goalSummary: string;
  goalType: string;
  coreWhy: string;
  motivationDetails: string[];
  successDefinition: string;
  currentStage: string;
  currentSkillOrBaseline: string;
  blockers: string[];
  constraints: string[];
  existingResources: string[];
  likelyMissingResources: string[];
  missingResources: string[];
  safetyBoundaries: string[];
  preferences: string[];
  dislikesOrAvoidances: string[];
  priorAttempts: string[];
  confidenceGaps: string[];
  examplesOrInspirations: string[];
  firstMilestoneReadiness: string;
  compactSourceSummary: string;
};

const REQUIRED_TEXT_FIELDS = [
  "goalSummary",
  "goalType",
  "coreWhy",
  "successDefinition",
  "currentStage",
  "currentSkillOrBaseline",
  "firstMilestoneReadiness",
  "compactSourceSummary",
] as const;

const REQUIRED_TEXT_ARRAY_FIELDS = [
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
] as const;

type RequiredTextField = (typeof REQUIRED_TEXT_FIELDS)[number];
type RequiredTextArrayField = (typeof REQUIRED_TEXT_ARRAY_FIELDS)[number];

export function parseInterviewOutputArtifact(input: unknown): InterviewOutputArtifact {
  if (!isRecord(input)) {
    throw new Error("Interview output artifact must be an object.");
  }

  const textFields = Object.fromEntries(
    REQUIRED_TEXT_FIELDS.map((field) => [field, readRequiredText(input, field)]),
  ) as Pick<InterviewOutputArtifact, RequiredTextField>;

  const textArrayFields = Object.fromEntries(
    REQUIRED_TEXT_ARRAY_FIELDS.map((field) => [field, readRequiredTextArray(input, field)]),
  ) as Pick<InterviewOutputArtifact, RequiredTextArrayField>;

  return {
    ...textFields,
    ...textArrayFields,
  };
}

function readRequiredText(input: Record<string, unknown>, field: RequiredTextField): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Interview output artifact field ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredTextArray(
  input: Record<string, unknown>,
  field: RequiredTextArrayField,
): string[] {
  const value = input[field];
  if (!Array.isArray(value)) {
    throw new Error(`Interview output artifact field ${field} must be an array of strings.`);
  }

  if (value.length === 0) {
    throw new Error(`Interview output artifact field ${field} must include at least one string.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(
        `Interview output artifact field ${field}[${index}] must be a non-empty string.`,
      );
    }

    return item.trim();
  });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
