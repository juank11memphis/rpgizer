import { redirect } from "next/navigation";

import type { GenerateInterviewOutputArtifactOutput } from "@/modules/game-master-assistant/application/generate-interview-output-artifact/output";
import { createGameMasterAssistantProduction } from "@/modules/game-master-assistant/infra/game-master-assistant-production";
import type { RequireCurrentUserResult } from "@/modules/user-identity/application/require-current-user/output";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

export type RetryForgeActionDependencies = {
  requireCurrentUser: () => Promise<RequireCurrentUserResult>;
  generateInterviewOutputArtifact: (input: {
    userId: string;
    adventureId: string;
  }) => Promise<GenerateInterviewOutputArtifactOutput>;
  redirectTo: (destination: string) => never;
};

export function createRetryForgeAction(dependencies: RetryForgeActionDependencies) {
  return async function retryForge(formData: FormData): Promise<void> {
    const adventureId = readRequiredAdventureId(formData);
    const currentUser = await dependencies.requireCurrentUser();

    if (currentUser.status === "unauthenticated") {
      dependencies.redirectTo(`/login?next=${encodeURIComponent(`/adventures/${adventureId}/forge`)}`);
    }

    await dependencies.generateInterviewOutputArtifact({
      userId: currentUser.user.id,
      adventureId,
    });
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

function readRequiredAdventureId(formData: FormData): string {
  const value = formData.get("adventureId");
  const adventureId = typeof value === "string" ? value.trim() : "";

  if (!adventureId) {
    throw new Error("Adventure id is required.");
  }

  return adventureId;
}
