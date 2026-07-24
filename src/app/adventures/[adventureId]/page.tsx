import { Suspense } from "react";

import { AdventureForgedToast } from "./adventure-forged-toast";

type AdventureDetailPageProps = {
  params: Promise<{
    adventureId: string;
  }>;
};

export const metadata = {
  title: "Adventure | RPGizer",
};

export default async function AdventureDetailPage({ params }: AdventureDetailPageProps) {
  await params;

  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-6 text-stone-100 sm:px-8 lg:px-10">
      <Suspense fallback={null}>
        <AdventureForgedToast />
      </Suspense>
    </main>
  );
}
