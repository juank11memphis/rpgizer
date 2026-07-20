import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import type {
  InterviewOutputArtifactEvalContext,
  InterviewOutputArtifactEvalExpectations,
  InterviewOutputArtifactEvalFixture,
  InterviewOutputArtifactEvalTranscriptMessage,
} from "../domain/interview-output-artifact-eval-types";
import {
  INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS,
  INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS,
} from "../domain/interview-output-artifact-eval-types";

export const DEFAULT_INTERVIEW_OUTPUT_ARTIFACT_EVAL_FIXTURES_DIR = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/evals/fixtures/interview-output-artifacts",
);

export async function loadInterviewOutputArtifactEvalFixtures(
  fixturesDirectory = DEFAULT_INTERVIEW_OUTPUT_ARTIFACT_EVAL_FIXTURES_DIR,
): Promise<InterviewOutputArtifactEvalFixture[]> {
  const fixtureNames = (await readdir(fixturesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (fixtureNames.length === 0) {
    throw new Error("No Interview Output Artifact eval fixtures found.");
  }

  const fixtures: InterviewOutputArtifactEvalFixture[] = [];
  for (const fixtureName of fixtureNames) {
    const fixturePath = path.join(fixturesDirectory, fixtureName);
    let rawFixture: unknown;

    try {
      rawFixture = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
    } catch (error) {
      throw new Error(`${fixtureName}: fixture JSON is invalid.`, { cause: error });
    }

    fixtures.push(parseFixture(rawFixture, fixtureName));
  }

  return fixtures;
}

function parseFixture(value: unknown, fixtureName: string): InterviewOutputArtifactEvalFixture {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: fixture must be an object.`);
  }

  const id = readRequiredString(value, "id", fixtureName);
  const name = readRequiredString(value, "name", fixtureName);
  const context = parseContext(value.context, fixtureName);
  const transcript = parseTranscript(value.transcript, fixtureName);
  const expectations = parseExpectations(value.expectations, fixtureName);

  if (transcript.length === 0) {
    throw new Error(`${fixtureName}: transcript must include at least one message.`);
  }

  return { id, name, context, transcript, expectations };
}

function parseContext(value: unknown, fixtureName: string): InterviewOutputArtifactEvalContext {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: context must be an object.`);
  }

  const readinessStatus = readRequiredString(value, "readinessStatus", fixtureName);
  if (readinessStatus !== "not_ready" && readinessStatus !== "ready_to_generate") {
    throw new Error(`${fixtureName}: context.readinessStatus is invalid.`);
  }

  const interviewStatus = readRequiredString(value, "interviewStatus", fixtureName);
  if (interviewStatus !== "interviewing" && interviewStatus !== "confirmed") {
    throw new Error(`${fixtureName}: context.interviewStatus is invalid.`);
  }

  return {
    goalText: readRequiredString(value, "goalText", fixtureName),
    readinessStatus,
    interviewStatus,
  };
}

function parseTranscript(
  value: unknown,
  fixtureName: string,
): InterviewOutputArtifactEvalTranscriptMessage[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fixtureName}: transcript must be an array.`);
  }

  return value.map((message, index) => {
    if (!isObject(message)) {
      throw new Error(`${fixtureName}: transcript[${index}] must be an object.`);
    }

    const role = readRequiredString(message, "role", fixtureName);
    if (role !== "user" && role !== "game_master") {
      throw new Error(`${fixtureName}: transcript[${index}] has invalid role.`);
    }

    return {
      role,
      content: readRequiredString(message, "content", fixtureName),
    };
  });
}

function parseExpectations(
  value: unknown,
  fixtureName: string,
): InterviewOutputArtifactEvalExpectations {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: expectations must be an object.`);
  }

  const expectations = Object.fromEntries(
    [...INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS, ...INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS].map(
      (field) => [field, parseFieldExpectation(value[field], fixtureName, field)],
    ),
  );

  return expectations as InterviewOutputArtifactEvalExpectations;
}

function parseFieldExpectation(value: unknown, fixtureName: string, fieldName: string) {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: expectations.${fieldName} must be an object.`);
  }

  const includes = value.includes;
  if (!Array.isArray(includes) || includes.length === 0) {
    throw new Error(`${fixtureName}: expectations.${fieldName}.includes must be a non-empty array.`);
  }

  return {
    includes: includes.map((item, index) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        throw new Error(
          `${fixtureName}: expectations.${fieldName}.includes[${index}] must be a non-empty string.`,
        );
      }

      return item.trim();
    }),
  };
}

function readRequiredString(
  value: Record<string, unknown>,
  fieldName: string,
  fixtureName: string,
): string {
  const fieldValue = value[fieldName];
  if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
    throw new Error(`${fixtureName}: ${fieldName} must be a non-empty string.`);
  }

  return fieldValue.trim();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
