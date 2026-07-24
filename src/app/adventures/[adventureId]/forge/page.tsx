import { notFound, redirect } from "next/navigation";

import { createGameMasterAssistantComposition } from "@/modules/game-master-assistant/infra/game-master-assistant-composition";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import { ForgeProgressClient } from "./forge-progress-client";

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

  const gameMasterAssistant = createGameMasterAssistantComposition();
  const { interview } = await gameMasterAssistant.getAdventureInterview({
    userId: currentUser.user.id,
    adventureId,
  });

  if (!interview) {
    notFound();
  }

  if (interview.draft.interviewStatus !== "confirmed") {
    redirect(`/adventures/${adventureId}/interview`);
  }

  return (
    <ForgeProgressClient
      adventureId={adventureId}
      eventsUrl={`/adventures/${adventureId}/forge/events`}
    />
  );
}
