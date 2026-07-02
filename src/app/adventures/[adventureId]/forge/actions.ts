import { redirect } from "next/navigation";

import type { GenerateInterviewOutputArtifactOutput } from "@/modules/game-master-assistant/application/generate-interview-output-artifact/output";
import { createGameMasterAssistantProduction } from "@/modules/game-master-assistant/infra/game-master-assistant-production";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";
import { APPLICATION_LOG_EVENTS } from "@/server/logging/events";
import { serverLogger } from "@/server/logging/logger";
import { serializeErrorForLog } from "@/server/logging/redaction";

export type RetryForgeActionDependencies = {
  requireCurrentUser: () => Promise<RequireCurrentUserResult>;
  generateInterviewOutputArtifact: (input: {
    userId: string;
    adventureId: string;
  }) => Promise<GenerateInterviewOutputArtifactOutput>;
  redirectTo: (destination: string) => never;
  logger?: RetryForgeLogger;
};

type RetryForgeLogger = Pick<typeof serverLogger, "info" | "warn" | "error">;

export function createRetryForgeAction(dependencies: RetryForgeActionDependencies) {
  return async function retryForge(formData: FormData): Promise<void> {
    const logger = dependencies.logger ?? serverLogger;
    const adventureId = readRequiredAdventureId(formData, logger);
    const currentUser = await dependencies.requireCurrentUser();

    if (currentUser.status === "unauthenticated") {
      const redirectDestination = `/login?next=${encodeURIComponent(`/adventures/${adventureId}/forge`)}`;
      logger.warn({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_UNAUTHENTICATED_REDIRECT,
        flow: "forge",
        action: "forge_retry",
        result: "unauthenticated_redirect",
        adventureId,
        redirectCategory: "login_required",
        redirectDestination,
      });
      dependencies.redirectTo(redirectDestination);
    }

    logger.info({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_STARTED,
      flow: "forge",
      action: "forge_retry",
      result: "started",
      userId: currentUser.user.id,
      adventureId,
    });

    try {
      const result = await dependencies.generateInterviewOutputArtifact({
        userId: currentUser.user.id,
        adventureId,
      });

      logger.info({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_SUCCESS,
        flow: "forge",
        action: "forge_retry",
        result: "success",
        userId: currentUser.user.id,
        adventureId,
        outputStatus: result.status,
        ...(result.status === "ready"
          ? {
              artifactId: result.artifactId,
              reusedExistingArtifact: result.reusedExistingArtifact,
            }
          : {}),
      });
    } catch (error) {
      logger.error({
        event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_FAILURE,
        flow: "forge",
        action: "forge_retry",
        result: "failure",
        userId: currentUser.user.id,
        adventureId,
        error: serializeErrorForLog(error),
      });
      throw error;
    }

    dependencies.redirectTo(`/adventures/${adventureId}/forge`);
  };
}

export async function retryForgeAction(formData: FormData): Promise<void> {
  "use server";

  const gameMasterAssistant = createGameMasterAssistantProduction();
  const action = createRetryForgeAction({
    requireCurrentUser: requireCurrentSessionUser,
    generateInterviewOutputArtifact: gameMasterAssistant.generateInterviewOutputArtifact,
    redirectTo: redirect,
  });

  return action(formData);
}

function readRequiredAdventureId(
  formData: FormData,
  logger: RetryForgeLogger,
): string {
  const value = formData.get("adventureId");
  const adventureId = typeof value === "string" ? value.trim() : "";

  if (!adventureId) {
    logger.warn({
      event: APPLICATION_LOG_EVENTS.SERVER_ACTION_FORGE_RETRY_VALIDATION_FAILED,
      flow: "forge",
      action: "forge_retry",
      result: "validation_failed",
      validationField: "adventureId",
      validationCategory: "empty",
    });
    throw new Error("Adventure id is required.");
  }

  return adventureId;
}
