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
  testCaseId?: string;
  logger?: GameMasterInterviewEvalLogger;
};
