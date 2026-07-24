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
  searchParams?: Promise<{
    travelerTest?: string;
  }>;
};

export default async function ForgeAdventurePage({
  params,
  searchParams,
}: ForgeAdventurePageProps) {
  const { adventureId } = await params;
  const resolvedSearchParams = await searchParams;
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    const nextPath = encodeURIComponent(`/adventures/${adventureId}/forge`);
    redirect(`/login?next=${nextPath}`);
  }

  const travelerTestMode = resolvedSearchParams?.travelerTest === "1";

  if (travelerTestMode) {
    return (
      <ForgeProgressClient
        adventureId={adventureId}
        eventsUrl={`/adventures/${adventureId}/forge/events`}
        travelerTestMode
      />
    );
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
