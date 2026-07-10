import { redirect } from "next/navigation";

import { createGameMasterAssistantComposition } from "@/modules/game-master-assistant/infra/game-master-assistant-composition";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import { AdventureDashboard } from "./adventure-dashboard";

export default async function DashboardPage() {
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    redirect("/login?next=/dashboard");
  }

  const gameMasterAssistant = createGameMasterAssistantComposition();
  const { draft } = await gameMasterAssistant.getDashboardAdventureDraft({
    userId: currentUser.user.id,
  });

  return <AdventureDashboard draft={draft} />;
}
