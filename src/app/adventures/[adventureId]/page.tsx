import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { createAdventureExperiencePresenterComposition } from "@/modules/adventure-experience-presenter/infra/adventure-experience-presenter-composition";
import { requireCurrentSessionUser } from "@/modules/user-identity/infra/auth/session";

import { AdventureDetailMenuScreen } from "./adventure-detail-menu-screen";
import { AdventureForgedToast } from "./adventure-forged-toast";
import { AdventureNotReady } from "./adventure-not-ready";

type AdventureDetailPageProps = {
  params: Promise<{
    adventureId: string;
  }>;
};

export const metadata = {
  title: "Adventure | RPGizer",
};

export default async function AdventureDetailPage({ params }: AdventureDetailPageProps) {
  const { adventureId } = await params;
  const currentUser = await requireCurrentSessionUser();

  if (currentUser.status === "unauthenticated") {
    const nextPath = encodeURIComponent(`/adventures/${adventureId}`);
    redirect(`/login?next=${nextPath}`);
  }

  const adventureExperiencePresenter = createAdventureExperiencePresenterComposition();
  const result = await adventureExperiencePresenter.getAdventureDetailMenu({
    userId: currentUser.user.id,
    adventureId,
  });

  if (result.status === "not_found") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-6 text-stone-100 sm:px-8 lg:px-10">
      <Suspense fallback={null}>
        <AdventureForgedToast />
      </Suspense>
      {result.status === "not_ready" ? (
        <AdventureNotReady adventureId={adventureId} />
      ) : (
        <AdventureDetailMenuScreen menu={result.menu} />
      )}
    </main>
  );
}
