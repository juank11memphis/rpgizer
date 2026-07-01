export const GAME_MASTER_INTERVIEWER_ERROR_CODES = [
  "configuration_missing",
  "provider_request_failed",
  "provider_output_invalid",
] as const;

export type GameMasterInterviewerErrorCode =
  (typeof GAME_MASTER_INTERVIEWER_ERROR_CODES)[number];

export const INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE =
  "Couldn’t save yet. Keep this page open and retry.";

export class GameMasterInterviewerError extends Error {
  constructor(
    readonly code: GameMasterInterviewerErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "GameMasterInterviewerError";
  }
}

export class InterviewProviderFailure extends Error {
  constructor(
    readonly code: GameMasterInterviewerErrorCode,
    readonly userMessage = INTERVIEW_PROVIDER_FAILURE_USER_MESSAGE,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "InterviewProviderFailure";
  }
}

export function normalizeInterviewProviderFailure(error: unknown): unknown {
  if (error instanceof GameMasterInterviewerError) {
    return new InterviewProviderFailure(error.code, undefined, { cause: error });
  }

  return error;
}
