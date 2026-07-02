import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createGameMasterAssistantProduction } from "@/modules/game-master-assistant/infra/game-master-assistant-production";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

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
  const { interview } = await gameMasterAssistant.getAdventureInterview({
    userId: currentUser.user.id,
    adventureId,
  });

  if (!interview) {
    notFound();
  }

  if (interview.draft.readinessStatus !== "ready_to_generate") {
    redirect(`/adventures/${adventureId}/interview`);
  }

  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-200">
          Interview complete
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl">
          Your Adventure is ready to forge.
        </h1>
        <p className="mt-5 text-base leading-7 text-stone-300">
          This is the next-step placeholder. Soon, RPGizer will turn your interview into quests, skills, inventory, and boss fights.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex min-h-12 items-center justify-center rounded-sm border border-amber-300/45 bg-black/35 px-6 text-center font-bold uppercase tracking-[0.12em] text-amber-100 outline-none transition hover:border-amber-200 hover:bg-amber-950/30 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d]"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
