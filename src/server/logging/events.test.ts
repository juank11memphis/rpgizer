import { describe, expect, it } from "vitest";

import { APPLICATION_LOG_EVENTS } from "./events";

describe("APPLICATION_LOG_EVENTS", () => {
  it("includes Interview Output Artifact eval events", () => {
    expect(APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_STARTED).toBe(
      "eval.interview_output_artifact.started",
    );
    expect(APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_COMPLETED).toBe(
      "eval.interview_output_artifact.completed",
    );
    expect(APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_FAILED).toBe(
      "eval.interview_output_artifact.failed",
    );
    expect(APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_CONFIG_BLOCKED).toBe(
      "eval.interview_output_artifact.config_blocked",
    );
    expect(APPLICATION_LOG_EVENTS.INTERVIEW_OUTPUT_ARTIFACT_EVAL_UNEXPECTED_ERROR).toBe(
      "eval.interview_output_artifact.unexpected_error",
    );
  });
  it("includes Forge SSE stream lifecycle events", () => {
    expect(APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_OPENED).toBe("forge.sse_stream.opened");
    expect(APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_COMPLETED).toBe("forge.sse_stream.completed");
    expect(APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_EXPECTED_ERROR).toBe(
      "forge.sse_stream.expected_error",
    );
    expect(APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_UNEXPECTED_ERROR).toBe(
      "forge.sse_stream.unexpected_error",
    );
    expect(APPLICATION_LOG_EVENTS.FORGE_SSE_STREAM_CLIENT_DISCONNECTED).toBe(
      "forge.sse_stream.client_disconnected",
    );
  });
});
