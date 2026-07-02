import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";
import type {
  InterviewOutputArtifactGenerationRequest,
  InterviewOutputArtifactGenerator,
} from "../generate-interview-output-artifact/ports";

export class FakeInterviewOutputArtifactGenerator implements InterviewOutputArtifactGenerator {
  readonly requests: InterviewOutputArtifactGenerationRequest[] = [];

  private queuedResults: Array<InterviewOutputArtifact | Error> = [];

  queueArtifact(artifact: InterviewOutputArtifact): void {
    this.queuedResults.push(artifact);
  }

  queueInvalidArtifact(artifact: unknown): void {
    this.queuedResults.push(artifact as InterviewOutputArtifact);
  }

  queueError(error: Error): void {
    this.queuedResults.push(error);
  }

  async generateArtifact(
    input: InterviewOutputArtifactGenerationRequest,
  ): Promise<InterviewOutputArtifact> {
    this.requests.push(input);
    const result = this.queuedResults.shift() ?? validInterviewOutputArtifact();

    if (result instanceof Error) {
      throw result;
    }

    return result;
  }
}

export function validInterviewOutputArtifact(
  overrides: Partial<InterviewOutputArtifact> = {},
): InterviewOutputArtifact {
  return {
    goalSummary: "Become a confident home chef.",
    coreWhy: "Cook healthier meals for family.",
    successDefinition: "Prepare three reliable dinners without stress.",
    currentStage: "Can cook basic pasta and eggs.",
    blockers: ["Limited weeknight time"],
    constraints: ["Vegetarian-friendly meals"],
    existingResources: ["Basic cookware"],
    likelyMissingResources: ["Meal planning routine"],
    safetyBoundaries: ["No medical nutrition advice"],
    preferences: ["Practical and encouraging tone"],
    compactSourceSummary: "The user wants a practical cooking adventure for weeknight meals.",
    ...overrides,
  };
}
