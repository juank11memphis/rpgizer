"use server";

import { redirect } from "next/navigation";

import { createGameMasterAssistantProduction } from "../../../modules/game-master-assistant/infra/game-master-assistant-production";
import { requireCurrentSessionUser } from "../../../modules/user-identity/infra/auth/session";
import {
  createStartAdventureFromGoalAction,
  type StartAdventureFormState,
} from "./actions-core";

export async function startAdventureFromGoalAction(
  previousState: StartAdventureFormState,
  formData: FormData,
): Promise<StartAdventureFormState> {
  const gameMasterAssistant = createGameMasterAssistantProduction();
  const action = createStartAdventureFromGoalAction({
    requireCurrentUser: requireCurrentSessionUser,
    startAdventureInterview: gameMasterAssistant.startAdventureInterview,
    redirectTo: redirect,
  });

  return action(previousState, formData);
}
