import { notFound, redirect } from "next/navigation";

import { createGameMasterAssistantProduction } from "@/modules/game-master-assistant/infra/game-master-assistant-production";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import { InterviewScreen } from "./interview-screen";

export const metadata = {
  title: "Adventure Interview | RPGizer",
};

type InterviewPageProps = {
  params: Promise<{
    adventureId: string;
  }>;
};

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { adventureId } = await params;
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    const nextPath = encodeURIComponent(`/adventures/${adventureId}/interview`);
    redirect(`/login?next=${nextPath}`);
  }

  const gameMasterAssistant = createGameMasterAssistantProduction();
  const { interview } = await gameMasterAssistant.getAdventureInterview({
    userId: currentUser.user.id,
    adventureId,
  });

  if (!interview) {
    notFound();
  }

  if (interview.draft.readinessStatus === "ready_to_generate") {
    redirect(`/adventures/${adventureId}/forge`);
  }

  return <InterviewScreen interview={interview} />;
}
