export const GAME_MASTER_INTERVIEWER_ERROR_CODES = [
  "configuration_missing",
  "provider_request_failed",
  "provider_output_invalid",
] as const;

export type GameMasterInterviewerErrorCode =
  (typeof GAME_MASTER_INTERVIEWER_ERROR_CODES)[number];

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
