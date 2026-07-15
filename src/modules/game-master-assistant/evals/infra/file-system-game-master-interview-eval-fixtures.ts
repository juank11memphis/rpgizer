import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  isGameMasterInterviewEvalCoveredSignalKey,
  type GameMasterInterviewEvalCoveredSignalKey,
  type GameMasterInterviewEvalExpectations,
  type GameMasterInterviewEvalFixture,
} from "../domain/game-master-interview-eval-types";

export const DEFAULT_GAME_MASTER_INTERVIEW_EVAL_FIXTURES_DIR = path.join(
  process.cwd(),
  "src/modules/game-master-assistant/evals/fixtures",
);

export async function loadGameMasterInterviewEvalFixtures(
  fixturesDirectory = DEFAULT_GAME_MASTER_INTERVIEW_EVAL_FIXTURES_DIR,
): Promise<GameMasterInterviewEvalFixture[]> {
  const fixtureNames = (await readdir(fixturesDirectory))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  if (fixtureNames.length === 0) {
    throw new Error("No Game Master eval fixtures found.");
  }

  const fixtures: GameMasterInterviewEvalFixture[] = [];
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

function parseFixture(value: unknown, fixtureName: string): GameMasterInterviewEvalFixture {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: fixture must be an object.`);
  }

  const id = readRequiredString(value, "id", fixtureName);
  const name = readRequiredString(value, "name", fixtureName);
  const goalText = readRequiredString(value, "goalText", fixtureName);
  const expectations = parseExpectations(value.expectations, fixtureName);
  const transcript = parseTranscript(value.transcript, fixtureName);

  if (transcript.length === 0) {
    throw new Error(`${fixtureName}: transcript must include at least one message.`);
  }

  return { id, name, goalText, expectations, transcript };
}

function parseExpectations(
  value: unknown,
  fixtureName: string,
): GameMasterInterviewEvalExpectations {
  if (!isObject(value)) {
    throw new Error(`${fixtureName}: expectations must be an object.`);
  }

  return {
    requiredCoveredSignals: parseCoveredSignals(
      value.requiredCoveredSignals,
      fixtureName,
    ),
    mustAskOneQuestion: readRequiredBoolean(value, "mustAskOneQuestion", fixtureName),
    mustRemainNotReady: readRequiredBoolean(value, "mustRemainNotReady", fixtureName),
    requiresCurrentStageBeforeReady: readRequiredBoolean(
      value,
      "requiresCurrentStageBeforeReady",
      fixtureName,
    ),
    requiresExistingInventoryBeforeReady: readRequiredBoolean(
      value,
      "requiresExistingInventoryBeforeReady",
      fixtureName,
    ),
    highStakesSafety: readRequiredBoolean(value, "highStakesSafety", fixtureName),
    requiresConcreteExamples: readOptionalBoolean(
      value,
      "requiresConcreteExamples",
      false,
      fixtureName,
    ),
    forbiddenQuestionPatterns: parseOptionalStringArray(
      value.forbiddenQuestionPatterns,
      fixtureName,
      "forbiddenQuestionPatterns",
    ),
  };
}

function parseCoveredSignals(
  value: unknown,
  fixtureName: string,
): GameMasterInterviewEvalCoveredSignalKey[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fixtureName}: requiredCoveredSignals must be a non-empty array.`);
  }

  return value.map((signal) => {
    if (typeof signal !== "string" || !isGameMasterInterviewEvalCoveredSignalKey(signal)) {
      throw new Error(`${fixtureName}: unknown covered signal '${String(signal)}'.`);
    }

    return signal;
  });
}

function parseTranscript(
  value: unknown,
  fixtureName: string,
): GameMasterInterviewEvalFixture["transcript"] {
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

function readRequiredBoolean(
  value: Record<string, unknown>,
  fieldName: string,
  fixtureName: string,
): boolean {
  const fieldValue = value[fieldName];
  if (typeof fieldValue !== "boolean") {
    throw new Error(`${fixtureName}: ${fieldName} must be a boolean.`);
  }

  return fieldValue;
}

function readOptionalBoolean(
  value: Record<string, unknown>,
  fieldName: string,
  fallback: boolean,
  fixtureName: string,
): boolean {
  const fieldValue = value[fieldName];
  if (fieldValue === undefined) {
    return fallback;
  }

  if (typeof fieldValue !== "boolean") {
    throw new Error(`${fixtureName}: ${fieldName} must be a boolean when provided.`);
  }

  return fieldValue;
}

function parseOptionalStringArray(
  value: unknown,
  fixtureName: string,
  fieldName: string,
): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fixtureName}: ${fieldName} must be an array when provided.`);
  }

  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${fixtureName}: ${fieldName}[${index}] must be a non-empty string.`);
    }

    return item;
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
