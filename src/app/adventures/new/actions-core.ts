import { InterviewProviderFailure } from "../../../modules/game-master-assistant/application/start-adventure-interview/provider-error";
import type { RequireCurrentUserResult } from "../../../modules/user-identity/application/require-current-user/output";
import { APPLICATION_LOG_EVENTS } from "../../../server/logging/events";
import { serverLogger } from "../../../server/logging/logger";

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
  logger?: ServerActionLogger;
};

type ServerActionLogger = Pick<typeof serverLogger, "info" | "warn">;

export function createStartAdventureFromGoalAction(
  dependencies: StartAdventureActionDependencies,
): StartAdventureFormAction {
  return async function startAdventureFromGoal(
    _previousState: StartAdventureFormState,
    formData: FormData,
  ): Promise<StartAdventureFormState> {
    const goalText = readGoalText(formData);
    const logger = dependencies.logger ?? serverLogger;

    if (!goalText) {
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_START_ADVENTURE_VALIDATION_FAILED,
        flow: "adventure_creation",
        action: "start_adventure",
        result: "validation_failed",
        validationField: "goalText",
        validationCategory: "empty",
      });

      return {
        goalText: "",
        fieldError: EMPTY_GOAL_MESSAGE,
        formError: null,
      };
    }

    const currentUser = await dependencies.requireCurrentUser();

    if (currentUser.status === "unauthenticated") {
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_START_ADVENTURE_UNAUTHENTICATED_REDIRECT,
        flow: "adventure_creation",
        action: "start_adventure",
        result: "unauthenticated_redirect",
        redirectCategory: "login_required",
        redirectDestination: "/login?next=/adventures/new",
      });
      dependencies.redirectTo("/login?next=/adventures/new");
    }

    try {
      const result = await dependencies.startAdventureInterview({
        userId: currentUser.user.id,
        goalText,
      });

      logger.info({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_START_ADVENTURE_SUCCESS,
        flow: "adventure_creation",
        action: "start_adventure",
        result: "success",
        userId: currentUser.user.id,
        adventureId: result.draft.id,
      });

      dependencies.redirectTo(`/adventures/${result.draft.id}/interview`);
    } catch (error) {
      if (error instanceof InterviewProviderFailure) {
        logger.warn({
          event: APPLICATION_LOG_EVENTS.SERVER_ACTION_START_ADVENTURE_RECOVERABLE_FAILURE,
          flow: "adventure_creation",
          action: "start_adventure",
          result: "recoverable_failure",
          userId: currentUser.user.id,
          error: {
            name: error.name,
            code: error.code,
          },
        });

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
