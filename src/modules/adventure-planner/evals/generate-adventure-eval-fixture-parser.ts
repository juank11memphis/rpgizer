import { parseInterviewOutputArtifact } from "../../game-master-assistant/domain/interview-output-artifact";
import type { InterviewMessageRole } from "../../game-master-assistant/domain/interview-message";
import type {
  GenerateAdventureEvalExpectations,
  GenerateAdventureEvalFixture,
  GenerateAdventureEvalTranscriptMessage,
} from "./generate-adventure-eval-types";

export function parseGenerateAdventureEvalFixture(
  input: unknown,
  fixtureName = "fixture",
): GenerateAdventureEvalFixture {
  const record = readRecord(input, `${fixtureName}: fixture must be an object.`);

  return {
    id: readRequiredString(record, "id", fixtureName),
    name: readRequiredString(record, "name", fixtureName),
    goalText: readRequiredString(record, "goalText", fixtureName),
    interviewOutputArtifact: parseInterviewOutputArtifact(record.interviewOutputArtifact),
    transcript: parseTranscript(record.transcript, fixtureName),
    expectations: parseExpectations(record.expectations, fixtureName),
  };
}

function parseTranscript(
  input: unknown,
  fixtureName: string,
): GenerateAdventureEvalTranscriptMessage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error(`${fixtureName}: transcript must be a non-empty array.`);
  }

  return input.map((message, index) => {
    const record = readRecord(message, `${fixtureName}: transcript[${index}] must be an object.`);
    const role = readRequiredString(record, "role", fixtureName);

    if (!isInterviewMessageRole(role)) {
      throw new Error(`${fixtureName}: transcript[${index}] has invalid role.`);
    }

    return {
      role,
      content: readRequiredString(record, "content", fixtureName),
    };
  });
}

function parseExpectations(input: unknown, fixtureName: string): GenerateAdventureEvalExpectations {
  const record = readRecord(input, `${fixtureName}: expectations must be an object.`);

  return {
    highStakesSafety: readRequiredBoolean(record, "highStakesSafety", fixtureName),
    expectedGoalTerms: readRequiredStringArray(record, "expectedGoalTerms", fixtureName),
    expectedSkillThemes: readRequiredStringArray(record, "expectedSkillThemes", fixtureName),
    expectedInventoryThemes: readRequiredStringArray(record, "expectedInventoryThemes", fixtureName),
    forbiddenAdvicePatterns: readRequiredStringArray(record, "forbiddenAdvicePatterns", fixtureName),
  };
}

function readRequiredString(
  input: Record<string, unknown>,
  field: string,
  fixtureName: string,
): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fixtureName}: ${field} must be a non-empty string.`);
  }

  return value.trim();
}

function readRequiredBoolean(
  input: Record<string, unknown>,
  field: string,
  fixtureName: string,
): boolean {
  const value = input[field];
  if (typeof value !== "boolean") {
    throw new Error(`${fixtureName}: ${field} must be a boolean.`);
  }

  return value;
}

function readRequiredStringArray(
  input: Record<string, unknown>,
  field: string,
  fixtureName: string,
): string[] {
  const value = input[field];
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fixtureName}: ${field} must be a non-empty array.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${fixtureName}: ${field}[${index}] must be a non-empty string.`);
    }

    return item.trim();
  });
}

function readRecord(input: unknown, message: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(message);
  }

  return input as Record<string, unknown>;
}

function isInterviewMessageRole(role: string): role is InterviewMessageRole {
  return role === "user" || role === "game_master";
}
