export const APPLICATION_LOG_EVENTS = {
  SERVER_ACTION_START_ADVENTURE_VALIDATION_FAILED: "server_action.start_adventure.validation_failed",
  SERVER_ACTION_START_ADVENTURE_UNAUTHENTICATED_REDIRECT: "server_action.start_adventure.unauthenticated_redirect",
  SERVER_ACTION_START_ADVENTURE_SUCCESS: "server_action.start_adventure.success",
  SERVER_ACTION_START_ADVENTURE_RECOVERABLE_FAILURE: "server_action.start_adventure.recoverable_failure",
  SERVER_ACTION_INTERVIEW_ANSWER_VALIDATION_FAILED: "server_action.interview_answer.validation_failed",
  SERVER_ACTION_INTERVIEW_ANSWER_UNAUTHENTICATED_REDIRECT: "server_action.interview_answer.unauthenticated_redirect",
  SERVER_ACTION_INTERVIEW_ANSWER_SUCCESS: "server_action.interview_answer.success",
  SERVER_ACTION_INTERVIEW_ANSWER_EXPECTED_ERROR: "server_action.interview_answer.expected_error",
  SERVER_ACTION_INTERVIEW_ANSWER_RECOVERABLE_FAILURE: "server_action.interview_answer.recoverable_failure",
  SERVER_ACTION_FORGE_RETRY_VALIDATION_FAILED: "server_action.forge_retry.validation_failed",
  SERVER_ACTION_FORGE_RETRY_UNAUTHENTICATED_REDIRECT: "server_action.forge_retry.unauthenticated_redirect",
  SERVER_ACTION_FORGE_RETRY_STARTED: "server_action.forge_retry.started",
  SERVER_ACTION_FORGE_RETRY_SUCCESS: "server_action.forge_retry.success",
  SERVER_ACTION_FORGE_RETRY_FAILURE: "server_action.forge_retry.failure",
  SERVER_ACTION_RUN_EVAL_SUITE_STARTED: "server_action.run_eval_suite.started",
  SERVER_ACTION_RUN_EVAL_SUITE_COMPLETED: "server_action.run_eval_suite.completed",
  SERVER_ACTION_RUN_EVAL_SUITE_BLOCKED: "server_action.run_eval_suite.blocked",
  SERVER_ACTION_RUN_EVAL_SUITE_UNEXPECTED_ERROR: "server_action.run_eval_suite.unexpected_error",
  AUTH_SIGN_IN_SUCCESS: "auth.sign_in.success",
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
  FORGE_GENERATE_ADVENTURE_NOT_FOUND: "forge.generate_adventure.not_found",
  FORGE_GENERATE_ADVENTURE_NOT_CONFIRMED: "forge.generate_adventure.not_confirmed",
  FORGE_GENERATE_ADVENTURE_ARTIFACT_CREATED: "forge.generate_adventure.artifact_created",
  FORGE_GENERATE_ADVENTURE_ARTIFACT_REUSED: "forge.generate_adventure.artifact_reused",
  FORGE_GENERATE_ADVENTURE_REUSED_EXISTING: "forge.generate_adventure.reused_existing",
  FORGE_GENERATE_ADVENTURE_STARTED: "forge.generate_adventure.started",
  FORGE_GENERATE_ADVENTURE_COMPLETED: "forge.generate_adventure.completed",
  FORGE_GENERATE_ADVENTURE_RECOVERABLE_FAILURE: "forge.generate_adventure.recoverable_failure",
  FORGE_GENERATE_ADVENTURE_UNEXPECTED_FAILURE: "forge.generate_adventure.unexpected_failure",
  FORGE_GENERATE_ADVENTURE_PROVIDER_STARTED: "forge.generate_adventure.provider_started",
  FORGE_GENERATE_ADVENTURE_PROVIDER_COMPLETED: "forge.generate_adventure.provider_completed",
  FORGE_GENERATE_ADVENTURE_PROVIDER_FAILED: "forge.generate_adventure.provider_failed",
  FORGE_GENERATE_ADVENTURE_OUTPUT_INVALID: "forge.generate_adventure.output_invalid",
  FORGE_GENERATE_ADVENTURE_WORKFLOW_STARTED: "forge.generate_adventure.workflow.started",
  FORGE_GENERATE_ADVENTURE_WORKFLOW_STEP_COMPLETED:
    "forge.generate_adventure.workflow.step_completed",
  FORGE_GENERATE_ADVENTURE_WORKFLOW_FAILED: "forge.generate_adventure.workflow.failed",
  FORGE_GENERATE_ADVENTURE_WORKFLOW_COMPLETED: "forge.generate_adventure.workflow.completed",
  FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_STARTED:
    "forge.generate_adventure.final_assembly.started",
  FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_COMPLETED:
    "forge.generate_adventure.final_assembly.completed",
  FORGE_GENERATE_ADVENTURE_FINAL_ASSEMBLY_FAILED:
    "forge.generate_adventure.final_assembly.failed",
  FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_COMPLETED:
    "forge.generate_adventure.final_validation.completed",
  FORGE_GENERATE_ADVENTURE_FINAL_VALIDATION_FAILED:
    "forge.generate_adventure.final_validation.failed",
  FORGE_GENERATE_ADVENTURE_CONTENT_STARTED: "forge.generate_adventure.content.started",
  FORGE_GENERATE_ADVENTURE_CONTENT_COMPLETED: "forge.generate_adventure.content.completed",
  FORGE_GENERATE_ADVENTURE_CONTENT_FAILED: "forge.generate_adventure.content.failed",
  FORGE_GENERATE_ADVENTURE_CONTENT_INVALID: "forge.generate_adventure.content.invalid",
  FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_STARTED:
    "forge.generate_adventure.dependency_linking.started",
  FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_COMPLETED:
    "forge.generate_adventure.dependency_linking.completed",
  FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_FAILED:
    "forge.generate_adventure.dependency_linking.failed",
  FORGE_GENERATE_ADVENTURE_DEPENDENCY_LINKING_INVALID:
    "forge.generate_adventure.dependency_linking.invalid",
  FORGE_GENERATE_ADVENTURE_XP_BALANCING_STARTED:
    "forge.generate_adventure.xp_balancing.started",
  FORGE_GENERATE_ADVENTURE_XP_BALANCING_COMPLETED:
    "forge.generate_adventure.xp_balancing.completed",
  FORGE_GENERATE_ADVENTURE_XP_BALANCING_FAILED:
    "forge.generate_adventure.xp_balancing.failed",
  FORGE_GENERATE_ADVENTURE_XP_BALANCING_INVALID:
    "forge.generate_adventure.xp_balancing.invalid",
  FORGE_SSE_STREAM_OPENED: "forge.sse_stream.opened",
  FORGE_SSE_STREAM_COMPLETED: "forge.sse_stream.completed",
  FORGE_SSE_STREAM_EXPECTED_ERROR: "forge.sse_stream.expected_error",
  FORGE_SSE_STREAM_UNEXPECTED_ERROR: "forge.sse_stream.unexpected_error",
  FORGE_SSE_STREAM_CLIENT_DISCONNECTED: "forge.sse_stream.client_disconnected",
  GENERATE_ADVENTURE_EVAL_STARTED: "eval.generate_adventure.started",
  GENERATE_ADVENTURE_EVAL_COMPLETED: "eval.generate_adventure.completed",
  GENERATE_ADVENTURE_EVAL_FAILED: "eval.generate_adventure.failed",
  GENERATE_ADVENTURE_EVAL_CONFIG_BLOCKED: "eval.generate_adventure.config_blocked",
  GAME_MASTER_INTERVIEW_EVAL_STARTED: "eval.game_master_interview.started",
  GAME_MASTER_INTERVIEW_EVAL_COMPLETED: "eval.game_master_interview.completed",
  GAME_MASTER_INTERVIEW_EVAL_FAILED: "eval.game_master_interview.failed",
  GAME_MASTER_INTERVIEW_EVAL_CONFIG_BLOCKED: "eval.game_master_interview.config_blocked",
  GAME_MASTER_INTERVIEW_EVAL_UNEXPECTED_ERROR:
    "eval.game_master_interview.unexpected_error",
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_STARTED: "eval.interview_output_artifact.started",
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_COMPLETED: "eval.interview_output_artifact.completed",
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_FAILED: "eval.interview_output_artifact.failed",
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_CONFIG_BLOCKED:
    "eval.interview_output_artifact.config_blocked",
  INTERVIEW_OUTPUT_ARTIFACT_EVAL_UNEXPECTED_ERROR:
    "eval.interview_output_artifact.unexpected_error",
  AI_OPENAI_REQUEST_COMPLETED: "ai.openai.request.completed",
  AI_OPENAI_REQUEST_FAILED: "ai.openai.request.failed",
  AI_OPENAI_OUTPUT_INVALID: "ai.openai.output.invalid",
  AI_OPENAI_PAYLOAD_DEBUG: "ai.openai.payload.debug",
} as const;

export type ApplicationLogEventName =
  (typeof APPLICATION_LOG_EVENTS)[keyof typeof APPLICATION_LOG_EVENTS];
