export const APPLICATION_LOG_EVENTS = {
  ADVENTURE_DRAFT_CREATE_SUCCESS: "adventure_draft.create.success",
  INTERVIEW_ANSWER_PERSISTED: "interview.answer.persisted",
  INTERVIEW_TURN_COMPLETED: "interview.turn.completed",
  INTERVIEW_TURN_RECOVERABLE_FAILURE: "interview.turn.recoverable_failure",
  INTERVIEW_READINESS_CHANGED: "interview.readiness.changed",
  INTERVIEW_CONFIRMED: "interview.confirmed",
  FORGE_ARTIFACT_GENERATION_NOT_FOUND: "forge.artifact_generation.not_found",
  FORGE_ARTIFACT_GENERATION_NOT_CONFIRMED: "forge.artifact_generation.not_confirmed",
  FORGE_ARTIFACT_GENERATION_REUSED_EXISTING: "forge.artifact_generation.reused_existing",
  FORGE_ARTIFACT_GENERATION_STARTED: "forge.artifact_generation.started",
  FORGE_ARTIFACT_GENERATION_FAILED: "forge.artifact_generation.failed",
  FORGE_ARTIFACT_GENERATION_COMPLETED: "forge.artifact_generation.completed",
  AI_OPENAI_REQUEST_COMPLETED: "ai.openai.request.completed",
  AI_OPENAI_REQUEST_FAILED: "ai.openai.request.failed",
  AI_OPENAI_OUTPUT_INVALID: "ai.openai.output.invalid",
  AI_OPENAI_PAYLOAD_DEBUG: "ai.openai.payload.debug",
} as const;

export type ApplicationLogEventName =
  (typeof APPLICATION_LOG_EVENTS)[keyof typeof APPLICATION_LOG_EVENTS];
