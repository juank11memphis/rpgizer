import type {
  GameMasterInterviewEvalFixtureLoader,
  GameMasterInterviewEvalInstructionsLoader,
  GameMasterInterviewEvalInterviewerFactory,
  GameMasterInterviewEvalLogger,
  GameMasterInterviewEvalRunnerEnvironment,
} from "./ports";

export type RunGameMasterInterviewEvalsInput = {
  environment: GameMasterInterviewEvalRunnerEnvironment;
  loadFixtures: GameMasterInterviewEvalFixtureLoader;
  loadInstructions: GameMasterInterviewEvalInstructionsLoader;
  createInterviewer: GameMasterInterviewEvalInterviewerFactory;
  model?: string;
  modelLabel?: string;
  testCaseId?: string;
  logger?: GameMasterInterviewEvalLogger;
};
