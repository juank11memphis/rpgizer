import type { InterviewOutputArtifact } from "../../domain/interview-output-artifact";
import {
  INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS,
  INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS,
  type InterviewOutputArtifactEvalAssertion,
  type InterviewOutputArtifactEvalDiagnostic,
  type InterviewOutputArtifactEvalFixture,
  type InterviewOutputArtifactRequiredTextArrayField,
  type InterviewOutputArtifactRequiredTextField,
} from "./interview-output-artifact-eval-types";

export type InterviewOutputArtifactEvalCheckResult = {
  assertions: InterviewOutputArtifactEvalAssertion[];
  diagnostics: InterviewOutputArtifactEvalDiagnostic[];
};

export function checkInterviewOutputArtifactEvalAssertions(
  fixture: InterviewOutputArtifactEvalFixture,
  artifact: InterviewOutputArtifact,
): InterviewOutputArtifactEvalCheckResult {
  const assertions: InterviewOutputArtifactEvalAssertion[] = [
    ...INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_FIELDS.map((field) =>
      checkRequiredTextField(artifact, field),
    ),
    ...INTERVIEW_OUTPUT_ARTIFACT_REQUIRED_TEXT_ARRAY_FIELDS.map((field) =>
      checkRequiredTextArrayField(artifact, field),
    ),
    ...Object.entries(fixture.expectations).flatMap(([field, expectation]) => [
      ...(expectation.includes ?? []).map((expectedText) =>
        checkExpectedTextInField({
          artifact,
          field: field as keyof InterviewOutputArtifact,
          expectedText,
        }),
      ),
      ...(expectation.includesAny ?? []).map((expectedAlternatives) =>
        checkAnyExpectedTextInField({
          artifact,
          field: field as keyof InterviewOutputArtifact,
          expectedAlternatives,
        }),
      ),
    ]),
  ];

  const diagnostics = assertions
    .filter((assertion) => assertion.status === "failed")
    .map((assertion) => ({
      fixtureId: fixture.id,
      assertionId: assertion.id,
      message: assertion.message ?? assertion.label,
    }));

  return { assertions, diagnostics };
}

function checkRequiredTextField(
  artifact: InterviewOutputArtifact,
  field: InterviewOutputArtifactRequiredTextField,
): InterviewOutputArtifactEvalAssertion {
  const value = artifact[field];
  const passed = typeof value === "string" && value.trim().length > 0;
  return {
    id: `required-${field}`,
    label: `${field} is present`,
    status: passed ? "passed" : "failed",
    ...(passed ? {} : { message: `${field} must be a meaningful non-empty string.` }),
  };
}

function checkRequiredTextArrayField(
  artifact: InterviewOutputArtifact,
  field: InterviewOutputArtifactRequiredTextArrayField,
): InterviewOutputArtifactEvalAssertion {
  const value = artifact[field];
  const passed =
    Array.isArray(value) &&
    value.some((item) => typeof item === "string" && item.trim().length > 0) &&
    value.every((item) => typeof item === "string");
  return {
    id: `required-${field}`,
    label: `${field} includes usable entries`,
    status: passed ? "passed" : "failed",
    ...(passed ? {} : { message: `${field} must include at least one meaningful text entry.` }),
  };
}

function checkExpectedTextInField(input: {
  artifact: InterviewOutputArtifact;
  field: keyof InterviewOutputArtifact;
  expectedText: string;
}): InterviewOutputArtifactEvalAssertion {
  const actualText = normalizeText(readArtifactFieldAsText(input.artifact, input.field));
  const expectedText = normalizeText(input.expectedText);
  const passed = actualText.includes(expectedText);
  const assertionId = `expect-${input.field}-includes-${slugify(input.expectedText)}`;

  return {
    id: assertionId,
    label: `${input.field} includes ${input.expectedText}`,
    status: passed ? "passed" : "failed",
    ...(passed
      ? {}
      : {
          message: `expected ${input.field} to include '${input.expectedText}'.`,
        }),
  };
}

function checkAnyExpectedTextInField(input: {
  artifact: InterviewOutputArtifact;
  field: keyof InterviewOutputArtifact;
  expectedAlternatives: string[];
}): InterviewOutputArtifactEvalAssertion {
  const actualText = normalizeText(readArtifactFieldAsText(input.artifact, input.field));
  const expectedAlternatives = input.expectedAlternatives.map(normalizeText);
  const passed = expectedAlternatives.some((expectedText) => actualText.includes(expectedText));
  const assertionId = `expect-${input.field}-includes-any-${expectedAlternatives.map(slugify).join("-or-")}`;
  const expectedText = input.expectedAlternatives.join("' or '");

  return {
    id: assertionId,
    label: `${input.field} includes ${expectedText}`,
    status: passed ? "passed" : "failed",
    ...(passed
      ? {}
      : {
          message: `expected ${input.field} to include '${expectedText}'.`,
        }),
  };
}

function readArtifactFieldAsText(
  artifact: InterviewOutputArtifact,
  field: keyof InterviewOutputArtifact,
): string {
  const value = artifact[field];
  return Array.isArray(value) ? value.join(" ") : value;
}

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/gu, " ").trim();
}

function slugify(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
