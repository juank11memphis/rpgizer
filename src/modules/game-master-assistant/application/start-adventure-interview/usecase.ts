import { ADVENTURE_DRAFT_STATE } from "../../domain/adventure-draft-state";
import { normalizeRequiredInterviewText } from "../../domain/interview-message";
import { normalizeInterviewProviderFailure } from "../start-adventure-interview/provider-error";
import type { StartAdventureInterviewInput } from "./input";
import type { StartAdventureInterviewOutput } from "./output";
import type {
  GameMasterInterviewer,
  StartAdventureInterviewRepository,
} from "./ports";

const INITIAL_READINESS_STATUS = "not_ready";

export type StartAdventureInterviewDependencies = {
  adventureDraftRepository: StartAdventureInterviewRepository;
  gameMasterInterviewer: GameMasterInterviewer;
};

export async function startAdventureInterview(
  input: StartAdventureInterviewInput,
  dependencies: StartAdventureInterviewDependencies,
): Promise<StartAdventureInterviewOutput> {
  const goalText = normalizeRequiredInterviewText("Goal", input.goalText);
  const repository = dependencies.adventureDraftRepository;

  const draft = await repository.createDraft({
    userId: input.userId,
    goalText,
    state: ADVENTURE_DRAFT_STATE,
    readinessStatus: INITIAL_READINESS_STATUS,
  });

  const initialGoalMessage = await repository.appendInterviewMessage({
    userId: input.userId,
    adventureId: draft.id,
    role: "user",
    content: goalText,
  });

  const interviewerResult = await askGameMasterInterviewer(() =>
    dependencies.gameMasterInterviewer.askNextQuestion({
      userId: input.userId,
      adventureId: draft.id,
      goalText: draft.goalText,
      readinessStatus: draft.readinessStatus,
      transcript: [initialGoalMessage],
    }),
  );

  const gameMasterMessageText = normalizeRequiredInterviewText(
    "Game Master message",
    interviewerResult.messageToUser,
  );

  const gameMasterMessage = await repository.appendInterviewMessage({
    userId: input.userId,
    adventureId: draft.id,
    role: "game_master",
    content: gameMasterMessageText,
  });

  if (interviewerResult.readinessStatus !== draft.readinessStatus) {
    await repository.updateReadiness({
      userId: input.userId,
      adventureId: draft.id,
      readinessStatus: interviewerResult.readinessStatus,
    });
  }

  return {
    draft: {
      id: draft.id,
      goalText: draft.goalText,
      readinessStatus: interviewerResult.readinessStatus,
    },
    transcript: [initialGoalMessage, gameMasterMessage],
  };
}

async function askGameMasterInterviewer<T>(ask: () => Promise<T>): Promise<T> {
  try {
    return await ask();
  } catch (error) {
    throw normalizeInterviewProviderFailure(error);
  }
}
