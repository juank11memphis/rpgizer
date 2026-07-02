import { ADVENTURE_DRAFT_STATE } from "../../domain/adventure-draft-state";
import { normalizeRequiredInterviewText } from "../../domain/interview-message";
import { deriveInterviewStatusFromReadiness } from "../../domain/interview-status";
import { normalizeInterviewProviderFailure } from "../start-adventure-interview/provider-error";
import type { StartAdventureInterviewInput } from "./input";
import type { StartAdventureInterviewOutput } from "./output";
import type {
  GameMasterInterviewer,
  StartAdventureInterviewRepository,
} from "./ports";

const INITIAL_READINESS_STATUS = "not_ready";
const INITIAL_INTERVIEW_STATUS = "interviewing";

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
    interviewStatus: INITIAL_INTERVIEW_STATUS,
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

  const interviewStatus = deriveInterviewStatusFromReadiness(
    interviewerResult.readinessStatus,
  );

  if (
    interviewerResult.readinessStatus !== draft.readinessStatus ||
    interviewStatus !== draft.interviewStatus
  ) {
    await repository.updateReadiness({
      userId: input.userId,
      adventureId: draft.id,
      readinessStatus: interviewerResult.readinessStatus,
      interviewStatus,
    });
  }

  return {
    draft: {
      id: draft.id,
      goalText: draft.goalText,
      readinessStatus: interviewerResult.readinessStatus,
      interviewStatus,
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
