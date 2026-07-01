import { answerInterviewQuestion } from "../application/answer-interview-question/usecase";
import type { AnswerInterviewQuestionInput } from "../application/answer-interview-question/input";
import { getAdventureInterview } from "../application/get-adventure-interview/usecase";
import type { GetAdventureInterviewInput } from "../application/get-adventure-interview/input";
import { getDashboardAdventureDraft } from "../application/get-dashboard-adventure-draft/usecase";
import type { GetDashboardAdventureDraftInput } from "../application/get-dashboard-adventure-draft/input";
import { startAdventureInterview } from "../application/start-adventure-interview/usecase";
import type { StartAdventureInterviewInput } from "../application/start-adventure-interview/input";
import type { AnswerInterviewQuestionRepository } from "../application/answer-interview-question/ports";
import type { AdventureInterviewRepository } from "../application/get-adventure-interview/ports";
import type { DashboardAdventureDraftRepository } from "../application/get-dashboard-adventure-draft/ports";
import type {
  GameMasterInterviewer,
  StartAdventureInterviewRepository,
} from "../application/start-adventure-interview/ports";
import { getGameMasterAssistantDb } from "./db-client";
import {
  DrizzleAdventureDraftRepository,
  type GameMasterAssistantDb,
} from "./drizzle-adventure-draft-repository";
import { OpenAIGameMasterInterviewer } from "./openai-game-master-interviewer";

type ProductionAdventureDraftRepository = DashboardAdventureDraftRepository &
  StartAdventureInterviewRepository &
  AdventureInterviewRepository &
  AnswerInterviewQuestionRepository;

type ProductionDependencies = {
  db?: GameMasterAssistantDb;
  adventureDraftRepository?: ProductionAdventureDraftRepository;
  gameMasterInterviewer?: GameMasterInterviewer;
};

export function createGameMasterAssistantProduction(
  dependencies: ProductionDependencies = {},
) {
  const adventureDraftRepository =
    dependencies.adventureDraftRepository ??
    new DrizzleAdventureDraftRepository(dependencies.db ?? getGameMasterAssistantDb());
  const gameMasterInterviewer =
    dependencies.gameMasterInterviewer ?? new OpenAIGameMasterInterviewer();

  return {
    getDashboardAdventureDraft(input: GetDashboardAdventureDraftInput) {
      return getDashboardAdventureDraft(input, { adventureDraftRepository });
    },
    startAdventureInterview(input: StartAdventureInterviewInput) {
      return startAdventureInterview(input, {
        adventureDraftRepository,
        gameMasterInterviewer,
      });
    },
    getAdventureInterview(input: GetAdventureInterviewInput) {
      return getAdventureInterview(input, { adventureDraftRepository });
    },
    answerInterviewQuestion(input: AnswerInterviewQuestionInput) {
      return answerInterviewQuestion(input, {
        adventureDraftRepository,
        gameMasterInterviewer,
      });
    },
  };
}

export type GameMasterAssistantProduction = ReturnType<
  typeof createGameMasterAssistantProduction
>;
