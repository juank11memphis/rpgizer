import { redirect } from "next/navigation";

import { requireCurrentSessionUser } from "../../../modules/user-identity/infra/auth/session";

import { GoalPromptScreen } from "./goal-prompt-screen";

export const metadata = {
  title: "New Adventure | RPGizer",
};

export default async function NewAdventurePage() {
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    redirect("/login?next=/adventures/new");
  }

  return <GoalPromptScreen />;
}
