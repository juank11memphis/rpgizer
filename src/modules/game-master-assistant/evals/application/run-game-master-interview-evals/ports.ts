import type {
  GameMasterInterviewer,
  InterviewTurnRequest,
  InterviewTurnResult,
} from "../../../application/start-adventure-interview/ports";
import type { GameMasterInterviewEvalFixture } from "../../domain/game-master-interview-eval-types";
import type {
  GameMasterInterviewEvalBlockedResult,
  GameMasterInterviewEvalErrorResult,
  GameMasterInterviewEvalFailedResult,
  GameMasterInterviewEvalPassedResult,
} from "./output";

export type GameMasterInterviewEvalRunnerEnvironment = NodeJS.ProcessEnv;

export type GameMasterInterviewEvalInterviewer = Pick<GameMasterInterviewer, "askNextQuestion">;

export type GameMasterInterviewEvalFixtureLoader =
  () => Promise<GameMasterInterviewEvalFixture[]> | GameMasterInterviewEvalFixture[];

export type GameMasterInterviewEvalInstructionsLoader = () => Promise<string> | string;

export type GameMasterInterviewEvalInterviewerFactory = (input: {
  instructions: string;
  environment: GameMasterInterviewEvalRunnerEnvironment;
  model?: string;
}) => Promise<GameMasterInterviewEvalInterviewer> | GameMasterInterviewEvalInterviewer;

export type GameMasterInterviewEvalLogger = {
  started(fixtureIds: string[]): void;
  completed(result: GameMasterInterviewEvalPassedResult): void;
  failed(result: GameMasterInterviewEvalFailedResult): void;
  blocked(result: GameMasterInterviewEvalBlockedResult): void;
  error(result: GameMasterInterviewEvalErrorResult, error: unknown): void;
};

export type { InterviewTurnRequest, InterviewTurnResult };
