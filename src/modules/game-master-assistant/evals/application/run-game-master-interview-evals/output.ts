export type GameMasterInterviewEvalDiagnostic = {
  fixtureId: string;
  message: string;
};

export type GameMasterInterviewEvalRunDiagnostic = {
  message: string;
  errorName?: string;
};

export type GameMasterInterviewEvalRunResult =
  | GameMasterInterviewEvalPassedResult
  | GameMasterInterviewEvalFailedResult
  | GameMasterInterviewEvalBlockedResult
  | GameMasterInterviewEvalErrorResult;

export type GameMasterInterviewEvalPassedResult = {
  status: "passed";
  fixtureIds: string[];
  diagnostics: [];
  durationMs: number;
};

export type GameMasterInterviewEvalFailedResult = {
  status: "failed";
  fixtureIds: string[];
  diagnostics: GameMasterInterviewEvalDiagnostic[];
  durationMs: number;
};

export type GameMasterInterviewEvalBlockedResult = {
  status: "blocked";
  fixtureIds: [];
  diagnostics: [GameMasterInterviewEvalRunDiagnostic];
  blocker: "missing_openai_api_key" | "placeholder_openai_api_key" | "placeholder_openai_game_master_model";
  durationMs: number;
};

export type GameMasterInterviewEvalErrorResult = {
  status: "error";
  fixtureIds: string[];
  diagnostics: [GameMasterInterviewEvalRunDiagnostic];
  durationMs: number;
};
