"use server";

import { redirect } from "next/navigation";

import { createGameMasterAssistantComposition } from "@/modules/game-master-assistant/infra/game-master-assistant-composition";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import {
  createSubmitInterviewAnswerAction,
  type InterviewAnswerFormState,
} from "./actions-core";

export async function submitInterviewAnswerAction(
  previousState: InterviewAnswerFormState,
  formData: FormData,
): Promise<InterviewAnswerFormState> {
  const gameMasterAssistant = createGameMasterAssistantComposition();
  const action = createSubmitInterviewAnswerAction({
    requireCurrentUser: requireCurrentSessionUser,
    answerInterviewQuestion: gameMasterAssistant.answerInterviewQuestion,
    redirectTo: redirect,
  });

  return action(previousState, formData);
}
