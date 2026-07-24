import type { ForgeProgressReporter } from "@/modules/game-master-assistant/application/forge-adventure/progress";
import { createGameMasterAssistantComposition } from "@/modules/game-master-assistant/infra/game-master-assistant-composition";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";
import { serverLogger } from "@/server/logging/logger";

import { createForgeSseResponse } from "./route-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type ForgeEventsRouteContext = {
  params: Promise<{
    adventureId: string;
  }>;
};

export async function GET(
  request: Request,
  context: ForgeEventsRouteContext,
): Promise<Response> {
  const { adventureId } = await context.params;

  return createForgeSseResponse(
    { request, adventureId },
    {
      requireCurrentUser: requireCurrentSessionUser,
      forgeAdventure(input: {
        userId: string;
        adventureId: string;
        progressReporter: ForgeProgressReporter;
      }) {
        return createGameMasterAssistantComposition().forgeAdventure(input);
      },
      logger: serverLogger,
    },
  );
}
