import type { InterviewOutputArtifactGenerationRequest } from "../../../application/generate-interview-output-artifact/ports";
import type { InterviewMessage } from "../../../domain/interview-message";
import type { InterviewOutputArtifact } from "../../../domain/interview-output-artifact";
import { checkInterviewOutputArtifactEvalAssertions } from "../../domain/interview-output-artifact-eval-checks";
import type { InterviewOutputArtifactEvalFixture } from "../../domain/interview-output-artifact-eval-types";
import type { RunInterviewOutputArtifactEvalsInput } from "./input";
import type { InterviewOutputArtifactEvalGenerator } from "./ports";
import type { RawEvalArtifactId } from "@/modules/product-quality-evaluation/domain/eval-matrix";
import {
  INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID,
  createUnavailableInterviewOutputArtifactEvalCellMetrics,
  type InterviewOutputArtifactEvalArtifact,
  type InterviewOutputArtifactEvalBlockedResult,
  type InterviewOutputArtifactEvalCell,
  type InterviewOutputArtifactEvalErrorResult,
  type InterviewOutputArtifactEvalFailedResult,
  type InterviewOutputArtifactEvalRunDiagnostic,
  type InterviewOutputArtifactEvalRunResult,
} from "./output";

const EVAL_CREATED_AT = new Date(0);
const NOOP_LOGGER = {
  started() {},
  completed() {},
  failed() {},
  blocked() {},
  error() {},
};

type CredentialStatus =
  | { canRun: true; reason: "credentials configured" }
  | {
      canRun: false;
      blocker: InterviewOutputArtifactEvalBlockedResult["blocker"];
      reason: string;
    };

export async function runInterviewOutputArtifactEvalUseCase(
  input: RunInterviewOutputArtifactEvalsInput,
): Promise<InterviewOutputArtifactEvalRunResult> {
  const startedAt = Date.now();
  const logger = input.logger ?? NOOP_LOGGER;
  const credentialStatus = getCredentialStatus(input.environment, input.model);

  if (!credentialStatus.canRun) {
    const result: InterviewOutputArtifactEvalBlockedResult = {
      status: "blocked",
      fixtureIds: [],
      diagnostics: [{ message: credentialStatus.reason }],
      blocker: credentialStatus.blocker,
      durationMs: Date.now() - startedAt,
    };
    logger.blocked(result);
    return result;
  }

  let fixtureIds: string[] = [];

  try {
    const fixtures = selectFixtures(await input.loadFixtures(), input.testCaseId);
    fixtureIds = fixtures.map((fixture) => fixture.id);

    if (input.testCaseId && fixtures.length === 0) {
      const result: InterviewOutputArtifactEvalErrorResult = {
        status: "error",
        modelLabel: input.modelLabel,
        fixtureIds: [],
        diagnostics: [
          {
            errorName: "UnknownEvalTestCase",
            message:
              "Interview Output Artifact eval runner error: Error: Selected test case is not available.",
          },
        ],
        durationMs: Date.now() - startedAt,
      };
      logger.error(result, new Error("Unknown eval test case"));
      return result;
    }

    logger.started(fixtureIds);

    const instructions = await input.loadInstructions();
    const generator = await input.createGenerator({
      instructions,
      environment: input.environment,
      model: input.model,
    });
    const cells: InterviewOutputArtifactEvalCell[] = [];

    for (const fixture of fixtures) {
      cells.push(await runFixture(fixture, generator, instructions));
    }

    const diagnostics = cells.flatMap((cell) => cell.diagnostics);

    if (diagnostics.length > 0) {
      const result: InterviewOutputArtifactEvalFailedResult = {
        status: "failed",
        modelLabel: input.modelLabel,
        fixtureIds,
        diagnostics,
        cells,
        durationMs: Date.now() - startedAt,
      };
      logger.failed(result);
      return result;
    }

    const result = {
      status: "passed",
      modelLabel: input.modelLabel,
      fixtureIds,
      diagnostics: [],
      cells,
      durationMs: Date.now() - startedAt,
    } satisfies InterviewOutputArtifactEvalRunResult;
    logger.completed(result);
    return result;
  } catch (error) {
    const result: InterviewOutputArtifactEvalErrorResult = {
      status: "error",
      modelLabel: input.modelLabel,
      fixtureIds,
      diagnostics: [formatUnexpectedErrorDiagnostic(error)],
      durationMs: Date.now() - startedAt,
    };
    logger.error(result, error);
    return result;
  }
}

function selectFixtures(
  fixtures: InterviewOutputArtifactEvalFixture[],
  testCaseId: string | undefined,
): InterviewOutputArtifactEvalFixture[] {
  if (!testCaseId) {
    return fixtures;
  }

  return fixtures.filter((fixture) => fixture.id === testCaseId);
}

function getCredentialStatus(
  environment: RunInterviewOutputArtifactEvalsInput["environment"],
  modelOverride: string | undefined,
): CredentialStatus {
  const apiKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const model = environment.OPENAI_INTERVIEW_SUMMARY_MODEL?.trim() ?? "";
  const selectedModel = modelOverride?.trim() ?? "";

  if (apiKey.length === 0) {
    return {
      canRun: false,
      blocker: "missing_openai_api_key",
      reason: "OPENAI_API_KEY is not configured",
    };
  }

  if (isPlaceholderValue(apiKey)) {
    return {
      canRun: false,
      blocker: "placeholder_openai_api_key",
      reason: "OPENAI_API_KEY appears to be a placeholder value",
    };
  }

  if (selectedModel.length === 0 && model.length > 0 && isPlaceholderValue(model)) {
    return {
      canRun: false,
      blocker: "placeholder_openai_interview_summary_model",
      reason: "OPENAI_INTERVIEW_SUMMARY_MODEL appears to be a placeholder value",
    };
  }

  return { canRun: true, reason: "credentials configured" };
}

async function runFixture(
  fixture: InterviewOutputArtifactEvalFixture,
  generator: InterviewOutputArtifactEvalGenerator,
  instructions: string,
): Promise<InterviewOutputArtifactEvalCell> {
  const request = buildRequest(fixture);
  const startedAt = Date.now();
  const artifact = await generator.generateArtifact(request);
  const latencyMs = Date.now() - startedAt;
  const checkResult = checkInterviewOutputArtifactEvalAssertions(fixture, artifact);
  const output = serializeArtifactValue(artifact);
  const redactedOutput = redactSensitiveText(output);

  return {
    id: `${fixture.id}::${INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID}`,
    fixtureId: fixture.id,
    testCaseId: fixture.id,
    testCaseName: fixture.name,
    inputVariables: buildInputVariables(fixture),
    variantId: INTERVIEW_OUTPUT_ARTIFACT_DEFAULT_VARIANT_ID,
    variantName: "Default variant",
    status: checkResult.diagnostics.length > 0 ? "failed" : "passed",
    output: redactedOutput,
    outputPreview: buildOutputPreview(redactedOutput),
    assertions: checkResult.assertions,
    diagnostics: checkResult.diagnostics,
    metrics: createUnavailableInterviewOutputArtifactEvalCellMetrics(latencyMs),
    artifacts: buildRedactedArtifacts({ fixture, instructions, request, artifact }),
  };
}

function buildInputVariables(fixture: InterviewOutputArtifactEvalFixture): Record<string, string> {
  return {
    goal: redactSensitiveText(fixture.context.goalText),
    transcriptTurns: String(fixture.transcript.length),
  };
}

function buildRequest(
  fixture: InterviewOutputArtifactEvalFixture,
): InterviewOutputArtifactGenerationRequest {
  return {
    userId: `eval-user-${fixture.id}`,
    adventureId: `eval-adventure-${fixture.id}`,
    goalText: fixture.context.goalText,
    readinessStatus: fixture.context.readinessStatus,
    interviewStatus: fixture.context.interviewStatus,
    transcript: fixture.transcript.map((message, index) => ({
      id: `${fixture.id}-${index + 1}`,
      role: message.role,
      content: message.content,
      sequenceNumber: index + 1,
      createdAt: EVAL_CREATED_AT,
    })) satisfies InterviewMessage[],
  };
}

function buildRedactedArtifacts(input: {
  fixture: InterviewOutputArtifactEvalFixture;
  instructions: string;
  request: InterviewOutputArtifactGenerationRequest;
  artifact: InterviewOutputArtifact;
}): InterviewOutputArtifactEvalArtifact[] {
  return [
    buildArtifact("prompt", "Raw prompt", input.instructions),
    buildArtifact("request", "Raw request", input.request),
    buildArtifact("response", "Raw response", input.artifact),
    buildArtifact("expected", "Expected / Golden", input.fixture.expectations),
  ];
}

function buildArtifact(id: RawEvalArtifactId, label: string, value: unknown): InterviewOutputArtifactEvalArtifact {
  const serializedValue = serializeArtifactValue(value);

  if (serializedValue.length === 0) {
    return { id, label, localOnly: true, redactionState: "not_available" };
  }

  const redactedValue = redactSensitiveText(serializedValue);

  return {
    id,
    label,
    localOnly: true,
    redactionState: "redacted",
    value: redactedValue,
    preview: buildOutputPreview(redactedValue),
  };
}

function serializeArtifactValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  try {
    return JSON.stringify(value, redactSecretBearingFields, 2) ?? "";
  } catch {
    return "[Unserializable local artifact]";
  }
}

function redactSecretBearingFields(key: string, value: unknown): unknown {
  if (isSecretBearingKey(key)) {
    return "[REDACTED]";
  }

  return value;
}

function buildOutputPreview(output: string): string {
  const redactedOutput = redactSensitiveText(output).replace(/\s+/gu, " ").trim();
  return redactedOutput.length > 160 ? `${redactedOutput.slice(0, 157)}…` : redactedOutput;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/sk-[a-z0-9_-]+/giu, "[REDACTED]")
    .replace(/(authorization\s*["':=]\s*)(bearer\s+)?[^\s"',}]+/giu, "$1[REDACTED]")
    .replace(/(api[_-]?key|token|secret|credential|password|session|cookie)(\s*["':=]\s*)[^\s"',}]+/giu, "$1$2[REDACTED]");
}

function isSecretBearingKey(key: string): boolean {
  return /api[_-]?key|authorization|cookie|token|secret|credential|password|session/iu.test(key);
}

function isPlaceholderValue(value: string): boolean {
  return /^(changeme|change-me|placeholder|todo|your-|replace-me|replace-with-|example)/iu.test(value.trim());
}

function formatUnexpectedErrorDiagnostic(error: unknown): InterviewOutputArtifactEvalRunDiagnostic {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      message: `Interview Output Artifact eval runner error: ${error.name || "Error"}: ${formatSafeErrorMessage(error.message)}`,
    };
  }

  return {
    errorName: "NonErrorThrownValue",
    message:
      "Interview Output Artifact eval runner error: NonErrorThrownValue: A non-Error value was thrown.",
  };
}

function formatSafeErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return "Unknown error.";
  }

  if (!isSafeUnexpectedErrorMessage(trimmed)) {
    return "Unexpected eval runner failure.";
  }

  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
}

function isSafeUnexpectedErrorMessage(message: string): boolean {
  if (message.length > 240) {
    return false;
  }

  if (
    /sk-[a-z0-9_-]+/iu.test(message) ||
    /api[_ -]?key|secret|token|credential|password|prompt|provider|response|transcript|payload/iu.test(message)
  ) {
    return false;
  }

  return ["fixture", "json", "must be", "invalid", "unknown", "missing", "not found", "enoent"].some(
    (safeSignal) => message.toLowerCase().includes(safeSignal),
  );
}
