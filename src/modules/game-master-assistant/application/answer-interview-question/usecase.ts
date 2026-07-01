import { normalizeRequiredInterviewText } from "../../domain/interview-message";
import type { AnswerInterviewQuestionInput } from "./input";
import type { AnswerInterviewQuestionOutput } from "./output";
import type {
  AnswerInterviewQuestionRepository,
  GameMasterInterviewer,
} from "./ports";

export type AnswerInterviewQuestionDependencies = {
  adventureDraftRepository: AnswerInterviewQuestionRepository;
  gameMasterInterviewer: GameMasterInterviewer;
};

export async function answerInterviewQuestion(
  input: AnswerInterviewQuestionInput,
  dependencies: AnswerInterviewQuestionDependencies,
): Promise<AnswerInterviewQuestionOutput> {
  const answerText = normalizeRequiredInterviewText("Answer", input.answerText);
  const repository = dependencies.adventureDraftRepository;

  const existingInterview = await repository.getDraftWithTranscript({
    userId: input.userId,
    adventureId: input.adventureId,
  });

  if (!existingInterview) {
    throw new Error("Adventure draft was not found.");
  }

  const userMessage = await repository.appendInterviewMessage({
    userId: input.userId,
    adventureId: input.adventureId,
    role: "user",
    content: answerText,
  });
  const transcriptWithAnswer = [...existingInterview.transcript, userMessage];

  const interviewerResult = await dependencies.gameMasterInterviewer.askNextQuestion({
    userId: input.userId,
    adventureId: input.adventureId,
    goalText: existingInterview.draft.goalText,
    readinessStatus: existingInterview.draft.readinessStatus,
    transcript: transcriptWithAnswer,
  });

  const gameMasterMessageText = normalizeRequiredInterviewText(
    "Game Master message",
    interviewerResult.messageToUser,
  );

  const gameMasterMessage = await repository.appendInterviewMessage({
    userId: input.userId,
    adventureId: input.adventureId,
    role: "game_master",
    content: gameMasterMessageText,
  });

  await repository.updateReadiness({
    userId: input.userId,
    adventureId: input.adventureId,
    readinessStatus: interviewerResult.readinessStatus,
  });

  return {
    draft: {
      ...existingInterview.draft,
      readinessStatus: interviewerResult.readinessStatus,
    },
    transcript: [...transcriptWithAnswer, gameMasterMessage],
    userMessage,
    gameMasterMessage,
  };
}
