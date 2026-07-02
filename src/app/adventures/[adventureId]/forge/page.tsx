import { notFound, redirect } from "next/navigation";

import { createGameMasterAssistantProduction } from "@/modules/game-master-assistant/infra/game-master-assistant-production";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import { ForgeFailure } from "./forge-failure";
import { ForgeReady } from "./forge-ready";

export const metadata = {
  title: "Forge Adventure | RPGizer",
};

type ForgeAdventurePageProps = {
  params: Promise<{
    adventureId: string;
  }>;
};

export default async function ForgeAdventurePage({
  params,
}: ForgeAdventurePageProps) {
  const { adventureId } = await params;
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    const nextPath = encodeURIComponent(`/adventures/${adventureId}/forge`);
    redirect(`/login?next=${nextPath}`);
  }

  const gameMasterAssistant = createGameMasterAssistantProduction();
  const result = await gameMasterAssistant.generateInterviewOutputArtifact({
    userId: currentUser.user.id,
    adventureId,
  });

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "not_confirmed") {
    redirect(`/adventures/${adventureId}/interview`);
  }

  if (result.status === "recoverable_failure") {
    return <ForgeFailure adventureId={adventureId} message={result.message} />;
  }

  return <ForgeReady />;
}
