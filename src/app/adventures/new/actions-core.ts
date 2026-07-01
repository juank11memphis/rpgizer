import { InterviewProviderFailure } from "../../../modules/game-master-assistant/application/start-adventure-interview/provider-error";
import type { RequireCurrentUserResult } from "../../../modules/user-identity/application/require-current-user/output";

export const EMPTY_GOAL_MESSAGE = "Tell me the goal first.";

export type StartAdventureFormState = {
  goalText: string;
  fieldError: string | null;
  formError: string | null;
};

export type StartAdventureFormAction = (
  previousState: StartAdventureFormState,
  formData: FormData,
) => Promise<StartAdventureFormState>;

export const initialStartAdventureFormState: StartAdventureFormState = {
  goalText: "",
  fieldError: null,
  formError: null,
};

type StartAdventureInterview = (input: {
  userId: string;
  goalText: string;
}) => Promise<{ draft: { id: string } }>;

type StartAdventureActionDependencies = {
  requireCurrentUser: () => Promise<RequireCurrentUserResult>;
  startAdventureInterview: StartAdventureInterview;
  redirectTo: (destination: string) => never;
};

export function createStartAdventureFromGoalAction(
  dependencies: StartAdventureActionDependencies,
): StartAdventureFormAction {
  return async function startAdventureFromGoal(
    _previousState: StartAdventureFormState,
    formData: FormData,
  ): Promise<StartAdventureFormState> {
    const goalText = readGoalText(formData);

    if (!goalText) {
      return {
        goalText: "",
        fieldError: EMPTY_GOAL_MESSAGE,
        formError: null,
      };
    }

    const currentUser = await dependencies.requireCurrentUser();

    if (currentUser.status === "unauthenticated") {
      dependencies.redirectTo("/login?next=/adventures/new");
    }

    try {
      const result = await dependencies.startAdventureInterview({
        userId: currentUser.user.id,
        goalText,
      });

      dependencies.redirectTo(`/adventures/${result.draft.id}/interview`);
    } catch (error) {
      if (error instanceof InterviewProviderFailure) {
        return {
          goalText,
          fieldError: null,
          formError: error.userMessage,
        };
      }

      throw error;
    }
  };
}

function readGoalText(formData: FormData): string {
  const rawGoalText = formData.get("goalText");

  if (typeof rawGoalText !== "string") {
    return "";
  }

  return rawGoalText.trim();
}
