import Link from "next/link";

import { retryForgeAction } from "./actions";

type ForgeFailureProps = {
  adventureId: string;
  message: string;
};

export function ForgeFailure({ adventureId, message }: ForgeFailureProps) {
  return (
    <main className="min-h-screen bg-[#07030d] px-5 py-10 text-stone-100 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl flex-col justify-center text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-200">
          The forge sputtered
        </p>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight text-amber-100 sm:text-5xl">
          Couldn’t finish the forge.
        </h1>
        <p className="mt-5 text-base leading-7 text-stone-300">{message}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <form action={retryForgeAction}>
            <input type="hidden" name="adventureId" value={adventureId} />
            <button type="submit" className={actionClassName}>
              Try Again
            </button>
          </form>
          <Link href="/dashboard" className={secondaryActionClassName}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

const actionClassName =
  "inline-flex min-h-12 items-center justify-center rounded-sm border border-amber-300/45 bg-black/35 px-6 text-center font-bold uppercase tracking-[0.12em] text-amber-100 outline-none transition hover:border-amber-200 hover:bg-amber-950/30 focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d]";

const secondaryActionClassName =
  "inline-flex min-h-12 items-center justify-center rounded-sm border border-stone-500/45 bg-transparent px-6 text-center font-bold uppercase tracking-[0.12em] text-stone-200 outline-none transition hover:border-stone-300 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-stone-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07030d]";
